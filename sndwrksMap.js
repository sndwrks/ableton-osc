/**
 * One field, two numbers, no more guessing — 2026-09-03T00:00:00Z
 *
 * sndwrksMap.js — mapping editor for the sndwrks M4L device.
 *
 * This runs on the LOW-PRIORITY thread and that is fine, because it never touches
 * the note path. It only writes entries INTO the colls; the colls do the runtime
 * lookup natively on the scheduler thread when a note actually arrives.
 *
 * Everything leaves here as TEXT, through [fromsymbol]. That is deliberate:
 * Max's own atom parser then decides int vs float vs symbol, which is the only way
 * to emit a float like 1.0 from JavaScript (JS has one number type, and Max would
 * otherwise turn an integral value into an int atom). It is also what stops a
 * bare address being sent as a "symbol" message.
 */

// autowatch reloads this file whenever it changes on disk, which re-runs the top
// level and resets `maps` to empty. Nothing pushes the stored value back in, so the
// next Live Set save calls getvalueof() and writes that empty payload over the good
// one. Turn it on while iterating and re-open the device after every edit; leave it
// off in any patch you are going to save a set with.
autowatch = 0;
inlets = 1;
outlets = 9;

var OUT_NOTEON = 0;
var OUT_NOTEOFF = 1;
var OUT_GRID = 2;
var OUT_ADDR = 3;
var OUT_ARGS = 4;
var OUT_LABEL = 5;
var OUT_HOST = 6;       // "host <ip>" and "port <n>" straight to udpsend and node.script
var OUT_HOSTUI = 7;     // "set <ip>" to the SERVER textedit
var OUT_PORTUI = 8;     // "set <n>" to the PORT textedit

// set to 0 once everything works; while it is 1 every inbound message is logged
var DEBUG = 0;

var NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
var TRANSPORT_NAMES = ['udp', 'tcp'];

// maps[0] = note-on, maps[1] = note-off.  key = note number, value = {address, args}
var maps = [{}, {}];
var hostAddr = '';
var selected = 36;
var mode = 0;
var pendingAddress = '';
var pendingArgs = '';

// one port per transport, indexed exactly the way bTransport's live.tab does: 0 = udp,
// 1 = tcp. `transport` tracks which one is active and therefore which port OUT_HOST
// speaks for; settransport() is what moves it, mirroring setmode()/mode below.
var DEFAULT_PORTS = [52000, 52001];
var ports = DEFAULT_PORTS.slice();
var transport = 0;

// set by init(), which is driven by [live.thisdevice] — i.e. once Live has finished
// loading the device and restoring its parameters. Until then setvalueof() must not
// touch an outlet, because the cords downstream of it may not be live yet.
var deviceReady = 0;
var initTask;

setoutletassist(OUT_NOTEON, 'to coll sndwrks_noteon (via fromsymbol)');
setoutletassist(OUT_NOTEOFF, 'to coll sndwrks_noteoff (via fromsymbol)');
setoutletassist(OUT_GRID, 'selected <n> / clearmapped / mapnote <n>, to sndwrksGrid.js');
setoutletassist(OUT_ADDR, 'to address textedit');
setoutletassist(OUT_ARGS, 'to args textedit');
setoutletassist(OUT_LABEL, 'to selected-note comment');
setoutletassist(OUT_HOST, 'host <ip> / port <n> to udpsend + node.script');
setoutletassist(OUT_HOSTUI, 'set <ip> to the SERVER textedit');
setoutletassist(OUT_PORTUI, 'set <n> to the PORT textedit');

// ───────────────────────── helpers ─────────────────────────

// Live names middle C as C3, so note 60 is C3 and note 36 is C1.
function noteName (noteNumber) {
  return NAMES[noteNumber % 12] + (Math.floor(noteNumber / 12) - 2);
}

/**
 * Auto-infer with an override, matching sndwrks-tcp.js so both transports agree.
 *   1     -> int        1.5   -> float      hello -> symbol
 *   f:1   -> float 1.0  i:2.7 -> int 2      s:1   -> the string "1"
 * Unprefixed tokens are passed through untouched and Max types them.
 */
function argText (text) {
  if (!text) return '';
  var tokens = String(text).split(' ');
  var outputTokens = [];

  for (var tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
    var token = tokens[tokenIndex];
    if (token === '') continue;

    var forced = null;
    if (token.length > 2 && token.charAt(1) === ':' && 'ifs'.indexOf(token.charAt(0)) >= 0) {
      forced = token.charAt(0);
      token = token.substring(2);
    }

    if (forced === 'i') {
      outputTokens.push(String(parseInt(token, 10) || 0));
    } else if (forced === 'f') {
      var floatValue = parseFloat(token) || 0;
      // ".0" is what makes Max parse it as a float atom rather than an int
      outputTokens.push(floatValue % 1 === 0 ? floatValue.toFixed(1) : String(floatValue));
    } else if (forced === 's') {
      outputTokens.push('"' + token + '"');
    } else {
      outputTokens.push(token);
    }
  }

  return outputTokens.join(' ');
}

// shared by port(), host()'s splitHostPort() branch, settransport() and
// deserialize() — a port is only ever valid if it is a whole number Max's socket
// objects can bind to.
function isValidPort (value) {
  return typeof value === 'number' && !isNaN(value) && value === Math.floor(value)
    && value >= 1 && value <= 65535;
}

// ───────────────────────── writing to the colls ─────────────────────────

function pushColl (layerIndex) {
  var outletIndex = (layerIndex === 0) ? OUT_NOTEON : OUT_NOTEOFF;
  outlet(outletIndex, 'clear');

  for (var key in maps[layerIndex]) {
    if (!maps[layerIndex].hasOwnProperty(key)) continue;
    var entry = maps[layerIndex][key];
    var line = 'store ' + parseInt(key, 10) + ' ' + entry.address;
    var extra = argText(entry.args);
    if (extra) line += ' ' + extra;
    outlet(outletIndex, line);
  }
}

// sndwrksGrid.js (v8ui) redraws its cells wholesale from a full set rather than being
// diffed against. The matrixctrl it replaces used to echo its own 'clear' back into
// list(), which was the stack overflow the README documented as a gotcha; owning the
// drawing removes that whole class of bug, so do not reintroduce a diff here.
//
// Every message below carries a symbol selector and at most ONE scalar argument.
// That shape is not cosmetic. The two forms it replaces both left the shipped grid
// completely inert -- a colour census of the device's grid found nothing but greys:
// no brand lime on a stored note, and no selection ring either, though `selected` is
// 36 from init() onward:
//
//   * outlet.apply(null, atoms) -- outlet() is a host builtin, not a JS function
//     object, so this throws "error calling function <caller>" with no further
//     detail, and took doset(), setmode() and init() down with it because all three
//     repaint.
//   * outlet(OUT_GRID, ['mapped', 36, 40]) -- one Array argument, the workaround for
//     that. Cycling '74's own shipped v8 examples do pass arrays to outlet() and they
//     flatten into atoms, so this SHOULD arrive as `mapped 36 40`; on the evidence
//     above it does not survive the trip out of this legacy [js] engine and into
//     [v8ui]. Whatever the mechanism, the ring going missing alongside the lime says
//     this line took the rest of the function with it.
//   * pushColl() above has always avoided variable-length atom lists too, building
//     one symbol and letting [fromsymbol] unpack it. Same lesson, reached earlier.
//
// 'selected' goes first so that the selection ring stays the canary: a grid that
// moves its ring but paints no lime means the map itself is empty, while a grid that
// does neither means the messages are not landing at all. sndwrksGrid.js logs every
// message it receives while its DEBUG flag is on, which tells the two apart outright.
function refreshGrid () {
  outlet(OUT_GRID, 'selected', selected);
  outlet(OUT_GRID, 'clearmapped');

  var key;
  for (key in maps[mode]) {
    if (maps[mode].hasOwnProperty(key)) outlet(OUT_GRID, 'mapnote', parseInt(key, 10));
  }
}

function refreshDetail () {
  var entry = maps[mode][selected];

  outlet(OUT_LABEL, 'set',
    noteName(selected) + '  (' + selected + ')  ' + (mode === 0 ? 'NOTE ON' : 'NOTE OFF'));

  if (entry) {
    outlet(OUT_ADDR, 'set', entry.address);
    pendingAddress = entry.address;
    if (entry.args) {
      outlet(OUT_ARGS, 'set', entry.args);
      pendingArgs = entry.args;
    } else {
      outlet(OUT_ARGS, 'clear');
      pendingArgs = '';
    }
  } else {
    outlet(OUT_ADDR, 'clear');
    outlet(OUT_ARGS, 'clear');
    pendingAddress = '';
    pendingArgs = '';
  }
}

// ───────────────────────── inbound messages ─────────────────────────

// sndwrksGrid.js calls this directly on a click (outlet 0 -> here), there being no
// more matrixctrl click handler to relay through.
function selectnote (noteNumber) {
  noteNumber = parseInt(noteNumber, 10);
  if (isNaN(noteNumber)) return;
  selected = Math.max(0, Math.min(127, noteNumber));
  refreshDetail();
  refreshGrid();
}

function setmode (requestedMode) {
  mode = (parseInt(requestedMode, 10) === 1) ? 1 : 0;
  refreshGrid();
  refreshDetail();
}

// [bTransport] -> [prepend settransport] -> here, mirroring exactly how tabMode
// reaches the js through [prepend setmode] and setmode() above. This does not
// change a port value, so it does not notifyclients() — the active transport index
// is not part of the persisted blob (see NOTES.md); only the two port numbers
// are, and those are unaffected by which one is currently on screen.
function settransport (requestedTransport) {
  transport = (parseInt(requestedTransport, 10) === 1) ? 1 : 0;
  outlet(OUT_PORTUI, 'set', ports[transport]);
  outlet(OUT_HOST, 'host', hostAddr);
  outlet(OUT_HOST, 'port', ports[transport]);
}

function joinAll (atoms) {
  var parts = [];
  for (var atomIndex = 0; atomIndex < atoms.length; atomIndex++) parts.push(String(atoms[atomIndex]));
  return parts.join(' ');
}

// textedit prefixes its output with the selector "text" — strip it
function fieldText (atoms) {
  var parts = [];
  for (var atomIndex = 0; atomIndex < atoms.length; atomIndex++) parts.push(String(atoms[atomIndex]));
  if (parts.length && parts[0] === 'text') parts.shift();
  return parts.join(' ').replace(/^\s+|\s+$/g, '');
}

function address () {
  pendingAddress = fieldText(arguments);
  if (DEBUG) post('sndwrks: address field -> "' + pendingAddress + '"\n');
}

function args () {
  pendingArgs = fieldText(arguments);
  if (DEBUG) post('sndwrks: args field -> "' + pendingArgs + '"\n');
}

// Each transport now remembers its own port, so a pasted "10.0.0.42:52123" is no
// longer a typo to strip — it is used. Split it into host and port so host() can
// store both and push them back to their own fields. Only when there is exactly one
// colon followed by digits, so a bare IPv6 literal such as ::1 is left alone.
function splitHostPort (hostString) {
  var match = hostString.match(/^([^:]+):([0-9]+)$/);
  if (!match) return { host: hostString, port: null };
  return { host: match[1], port: parseInt(match[2], 10) };
}

// [textedit] -> [route text] -> [prepend host] -> here, so Max has already stripped
// the 'host' selector. The variable is hostAddr, not host: a var of the same name
// would shadow this handler.
//
// This is the ONLY path from the SERVER field to udpsend and node.script, which is
// what makes the persisted host the same one in use. It is not a cycle: outlet 6
// goes to the two transports and nothing routes back to this inlet.
function host () {
  var split = splitHostPort(joinAll(arguments).replace(/^\s+|\s+$/g, ''));
  var hostChanged = split.host !== hostAddr;
  var portApplied = false;

  if (split.port !== null) {
    if (isValidPort(split.port)) {
      portApplied = split.port !== ports[transport];
      ports[transport] = split.port;
    } else {
      post('sndwrks: SERVER "' + split.host + ':' + split.port + '" has an out-of-range '
        + 'port (1-65535); keeping ' + TRANSPORT_NAMES[transport] + ' port at '
        + ports[transport] + '.\n');
    }
  }

  if (!hostChanged && !portApplied) return;
  hostAddr = split.host;

  if (split.port !== null) {
    post('sndwrks: SERVER "' + hostAddr + ':' + ports[transport] + '" split into host and '
      + TRANSPORT_NAMES[transport] + ' port.\n');
    outlet(OUT_HOSTUI, 'set', hostAddr);
    outlet(OUT_PORTUI, 'set', ports[transport]);
  } else if (DEBUG) {
    post('sndwrks: host -> "' + hostAddr + '"\n');
  }

  outlet(OUT_HOST, 'host', hostAddr);
  outlet(OUT_HOST, 'port', ports[transport]);
  notifyclients();
}

// [textedit] -> [route text] -> [prepend port] -> here. Same fieldText()/joinAll()
// treatment as host(). Validate integer, 1-65535; anything else is rejected with a
// post() saying what was wrong, and the stored value is left untouched.
function port () {
  var portText = fieldText(arguments);
  var portNumber = parseInt(portText, 10);
  if (!/^[0-9]+$/.test(portText) || !isValidPort(portNumber)) {
    post('sndwrks: PORT is "' + portText + '" — must be an integer 1-65535; keeping '
      + TRANSPORT_NAMES[transport] + ' port at ' + ports[transport] + '.\n');
    return;
  }
  if (portNumber === ports[transport]) return;
  ports[transport] = portNumber;
  if (DEBUG) post('sndwrks: ' + TRANSPORT_NAMES[transport] + ' port -> ' + portNumber + '\n');
  outlet(OUT_HOST, 'host', hostAddr);
  outlet(OUT_HOST, 'port', ports[transport]);
  notifyclients();
}

// anything that is not a handler above lands here, so an unexpected selector is
// visible instead of being silently dropped
function anything () {
  if (DEBUG) {
    post('sndwrks: UNHANDLED message "' + messagename + '" ' + joinAll(arguments) + '\n');
  }
}

function doset () {
  var trimmedAddress = pendingAddress.replace(/^\s+|\s+$/g, '');
  if (!trimmedAddress || trimmedAddress.charAt(0) !== '/') {
    post('sndwrks: address is "' + trimmedAddress + '" — must start with "/", nothing stored.\n');
    post('sndwrks: if you typed one, the field had not committed yet.\n');
    return;
  }
  if (DEBUG) post('sndwrks: storing note ' + selected + ' -> ' + trimmedAddress + ' [' + pendingArgs + ']\n');
  maps[mode][selected] = { address: trimmedAddress, args: pendingArgs.replace(/^\s+|\s+$/g, '') };
  pushColl(mode);
  refreshGrid();
  refreshDetail();      // re-read what was just stored, so the fields show the trimmed form
  notifyclients();      // marks the pattr value dirty so Live saves it
}

function dodelete () {
  delete maps[mode][selected];
  pushColl(mode);
  refreshGrid();
  refreshDetail();
  notifyclients();
}

function clearall () {
  maps = [{}, {}];
  pushColl(0);
  pushColl(1);
  refreshGrid();
  refreshDetail();
  notifyclients();
}

function init () {
  deviceReady = 1;
  pushColl(0);
  pushColl(1);
  refreshGrid();
  refreshDetail();
  outlet(OUT_PORTUI, 'set', ports[transport]);   // the PORT field always has a value to show
  if (hostAddr) {
    outlet(OUT_HOSTUI, 'set', hostAddr);   // textedit 'set' does not echo, so no cycle
    outlet(OUT_HOST, 'host', hostAddr);    // -> udpsend + node.script
    outlet(OUT_HOST, 'port', ports[transport]);
  }
}

// init is defined above, so this reads top to bottom instead of relying on
// function-declaration hoisting to resolve the reference
initTask = new Task(init, this);

// ───────────────────────── persistence ─────────────────────────
//
// State travels through [pattr sndwrksMappings], which is a Live parameter of type
// Blob (parameter_type 3). Blob is the only parameter type that can carry a symbol —
// the default is Float, which silently drops the payload on save, and that is why
// nothing ever came back. See pattr_param() in build-patch.py.
//
// pattr's middle (client) outlet feeds this object's inlet; that binding is what
// registers getvalueof/setvalueof, and it is the one part of the chain that was
// always working. Note that getvalueof() firing proves the binding, NOT that Live
// has ever seen a parameter — check View -> Parameters for that.
//
// js save()/embedmessage() is NOT the mechanism here — that writes into the patcher,
// so edits made inside Live would be lost the moment the set was reopened.
//
// Hex keeps the payload to a closed [0-9a-f] alphabet; raw JSON braces and quotes
// would be shredded by Max's atom parser on the way through.

var PAYLOAD_VERSION = 3;
var MIN_SUPPORTED_VERSION = 2;   // deserialize() still reads this, so no Live Set orphans
var CHUNK = 8000;          // hex chars per atom; Max's per-atom symbol limit is 32767

function hexEncode (inputString) {
  var hexString = '';
  for (var index = 0; index < inputString.length; index++) {
    var hexPair = inputString.charCodeAt(index).toString(16);
    hexString += (hexPair.length < 2 ? '0' + hexPair : hexPair);
  }
  return hexString;
}

function hexDecode (hexString) {
  var outputString = '';
  for (var index = 0; index + 1 < hexString.length; index += 2) {
    outputString += String.fromCharCode(parseInt(hexString.substr(index, 2), 16));
  }
  return outputString;
}

// hexEncode writes one byte per charCodeAt, so any code point above 0x7f produces 3
// or 4 hex digits and desynchronises the whole fixed-width decode — one em-dash
// pasted into an args field would lose every mapping. Escaping to \uXXXX first makes
// the string pure ASCII, and because it is JSON, JSON.parse turns the escapes back
// into the original characters on the way out. Lossless, and no UTF-8 codec needed.
function asciiFold (inputString) {
  return inputString.replace(/[\u0080-\uffff]/g, function foldChar (char) {
    return '\\u' + ('000' + char.charCodeAt(0).toString(16)).slice(-4);
  });
}

// The 'h' prefix is not cosmetic. A chunk boundary can land such that a chunk is all
// digits, which Max's atom parser reads as a number and rounds — destroying it. The
// un-chunked payload is safe only by accident (JSON.stringify always starts with '['
// = 0x5b, and the 'b' forces symbol interpretation); chunking removes that accident.
function chunkHex (hexString) {
  var chunks = [];
  for (var index = 0; index < hexString.length; index += CHUNK) chunks.push('h' + hexString.substr(index, CHUNK));
  if (!chunks.length) chunks.push('h');
  return chunks;
}

function unchunkHex (parts) {
  var hexString = '';
  for (var index = 0; index < parts.length; index++) {
    var part = String(parts[index]);
    hexString += (part.charAt(0) === 'h') ? part.substring(1) : part;
  }
  return hexString;
}

// maps is keyed by note number; on the wire it is an array of [note, address, args]
// triples. That is 56 chars per entry against 74 for the object form, which is what
// keeps all 256 slots under the 32767-char blob limit — true as long as address+args
// averages 53 characters or less. The trailing [udpPort, tcpPort] pair costs about a
// dozen more characters, no real risk against that budget.
function serialize () {
  var payloadArray = [PAYLOAD_VERSION, [], [], hostAddr, [ports[0], ports[1]]];
  for (var layerIndex = 0; layerIndex < 2; layerIndex++) {
    for (var key in maps[layerIndex]) {
      if (!maps[layerIndex].hasOwnProperty(key)) continue;
      payloadArray[layerIndex + 1].push([
        parseInt(key, 10), maps[layerIndex][key].address, maps[layerIndex][key].args || '',
      ]);
    }
  }
  return payloadArray;
}

// accepts v2 (no ports — every Live Set saved before this feature existed) and v3
// (ports included). Rejecting v2 outright would silently start every existing set
// empty the moment PAYLOAD_VERSION bumped, so both are read; only getvalueof()
// writes v3 going forward.
function deserialize (payload) {
  if (!payload || payload.length < 3) return null;
  var version = payload[0];
  if (version !== PAYLOAD_VERSION && version !== MIN_SUPPORTED_VERSION) return null;

  var next = [{}, {}];
  for (var layerIndex = 0; layerIndex < 2; layerIndex++) {
    var rows = payload[layerIndex + 1];
    if (!rows || typeof rows.length !== 'number') return null;
    for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      var row = rows[rowIndex];
      if (!row || row.length < 2) continue;
      var noteNumber = parseInt(row[0], 10);
      if (isNaN(noteNumber) || noteNumber < 0 || noteNumber > 127) continue;
      if (String(row[1]).charAt(0) !== '/') continue;
      next[layerIndex][noteNumber] = { address: String(row[1]), args: String(row[2] || '') };
    }
  }

  // ports are validated the same way notes and addresses are above: a corrupt or
  // missing entry degrades to the matching default rather than letting NaN reach a
  // socket. A v2 payload has no payload[4] at all, which lands here the same way.
  var restoredPorts = DEFAULT_PORTS.slice();
  var rawPorts = payload[4];
  if (rawPorts && typeof rawPorts.length === 'number') {
    var udpPort = parseInt(rawPorts[0], 10);
    var tcpPort = parseInt(rawPorts[1], 10);
    if (isValidPort(udpPort)) restoredPorts[0] = udpPort;
    if (isValidPort(tcpPort)) restoredPorts[1] = tcpPort;
  }

  return { maps: next, host: String(payload[3] || ''), ports: restoredPorts };
}

// pattr reads this when the Live Set is saved.
function getvalueof () {
  var hex = hexEncode(asciiFold(JSON.stringify(serialize())));
  var parts = chunkHex(hex);
  if (hex.length > 30000) {
    error('sndwrks: mapping payload is ' + hex.length + ' chars, close to the 32767 '
      + 'limit. Shorten some OSC addresses or mappings may be lost.\n');
  }
  if (DEBUG) {
    post('sndwrks: getvalueof -> ' + hex.length + ' chars in ' + parts.length + ' atom(s)\n');
  }
  return parts;
}

// pattr writes this back when the Live Set is loaded. Varargs: the payload arrives
// as however many atoms chunkHex produced.
//
// No outlet() from in here — see deviceReady above. This sets state and nothing else.
function setvalueof () {
  var parts = [];
  for (var argIndex = 0; argIndex < arguments.length; argIndex++) parts.push(arguments[argIndex]);
  var payload = unchunkHex(parts);

  // This log is the whole diagnostic. If the hex comes back here, pattr is carrying
  // the value and persistence works. If it is empty or not hex, pattr cannot hold a
  // payload this shape and the mapping needs to live somewhere else.
  post('sndwrks: setvalueof received ' + arguments.length + ' atom(s), '
    + payload.length + ' chars: "' + payload.substring(0, 40)
    + (payload.length > 40 ? '...' : '') + '"\n');

  var decoded = null;
  if (payload && /^[0-9a-f]+$/.test(payload)) {
    try {
      decoded = deserialize(JSON.parse(hexDecode(payload)));
      if (!decoded) {
        post('sndwrks: payload decoded but is not a valid v' + MIN_SUPPORTED_VERSION
          + ' or v' + PAYLOAD_VERSION + ' mapping table — starting empty\n');
      }
    } catch (parseError) {
      post('sndwrks: payload was hex but not valid JSON — starting empty\n');
    }
  }
  // an empty payload is normal on a first load — not an error worth shouting about

  maps = decoded ? decoded.maps : [{}, {}];
  hostAddr = decoded ? decoded.host : '';
  ports = decoded ? decoded.ports : DEFAULT_PORTS.slice();
  post('sndwrks: restored ' + countAll() + ' mapping(s)\n');

  // If Live has already finished loading the device, repaint one tick later. If it
  // has not, [live.thisdevice] -> [init( will do it and this branch is a no-op.
  if (deviceReady) { initTask.cancel(); initTask.schedule(0); }
}

function countAll () {
  var count = 0;
  var layerIndex;
  var key;
  for (layerIndex = 0; layerIndex < 2; layerIndex++) {
    for (key in maps[layerIndex]) if (maps[layerIndex].hasOwnProperty(key)) count++;
  }
  return count;
}
