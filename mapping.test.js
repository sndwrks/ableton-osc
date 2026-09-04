/**
 * Twice the ports, none of the diffing — 2026-09-03T00:00:00Z
 */

// pure-logic tests for sndwrksMap.js — the persistence codec and the coll writer.
//
// run with:  node mapping.test.js
//
// sndwrksMap.js is ES5 written for Max's [js] engine: no require, no module, and it
// calls setoutletassist() at the top level, so a plain require() throws before any
// export guard at the bottom could run. Instead, evaluate it in a vm context whose
// globals ARE the Max host — the same move roundtrip.test.js makes when it stubs
// 'max-api', one level lower, because [js] has no module system to intercept.
//
// the payoff is bigger than avoiding an export: top-level function and var
// declarations become properties of the context, so these tests get white-box access
// to hexEncode, serialize, doset, maps and friends with ZERO changes to the file
// that actually ships inside the device.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, 'sndwrksMap.js'), 'utf8');

function loadMap () {
  const s = {
    outlet (...args) {
      s._calls.push(args);
    },
    // in Max, outlet() is a host builtin, not a JS function object, and
    // outlet.apply(null, ...) throws "error calling function <caller>" with no
    // further detail. an ordinary stub accepts .apply happily, which is exactly
    // how a broken refreshGrid() passed every test here and still took doset(),
    // setmode() and init() down inside the device. make the stub refuse it too,
    // so the harness models the host rather than flattering it -- the trap is
    // installed just below, once the object exists.
    post (m) {
      s._posts.push(String(m));
    },
    error (m) {
      s._posts.push(`ERR ${String(m)}`);
    },
    setoutletassist () {},
    notifyclients () {
      s._notified += 1;
    },
    // captures the callback instead of running it, so tests can assert that
    // setvalueof() deferred rather than painted, then run the repaint by hand
    //
    // this stays a named `function` expression, not an arrow or method shorthand:
    // it is invoked as `new Task(init, this)` inside sndwrksMap.js, and neither an
    // arrow function nor a shorthand method is constructible with `new`.
    Task: function Task (fn) {
      this.cancel = () => {
        s._tasks.length = 0;
      };
      this.schedule = () => {
        s._tasks.push(fn);
      };
    },
    messagename: '',
  };
  s._calls = [];
  s._posts = [];
  s._tasks = [];
  s._notified = 0;
  s._reset = () => {
    s._calls.length = 0;
    s._posts.length = 0;
    s._tasks.length = 0;
    s._notified = 0;
  };
  Object.defineProperty(s.outlet, 'apply', {
    value () {
      throw new TypeError(
        'outlet.apply() is not callable in Max: outlet is a host builtin. '
        + 'pass the atoms as one array instead -- outlet(n, [selector, ...args]).',
      );
    },
  });

  vm.createContext(s);
  vm.runInContext(SRC, s, { filename: 'sndwrksMap.js' });
  return s;
}

// ───────────────────────── harness ─────────────────────────

let pass = 0;
let fail = 0;
function check (name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(40)} -> ${detail}`);
  if (ok) pass += 1;
  else fail += 1;
}
function eq (name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  check(name, a === e, a === e ? a : `${a}  !=  ${e}`);
}

// puts the module into a known state without going through the UI handlers
function seed (m, maps, host, ports) {
  m.maps = maps;
  m.hostAddr = host || '';
  m.ports = ports || m.DEFAULT_PORTS.slice();
}

// ───────────────────────── hex codec ─────────────────────────

{
  const m = loadMap();
  // every character Max's atom parser treats specially has to survive the trip
  const cases = ['', '/a/b', '/sndwrks/server/v1/confetti', '{}"[],; \\ 0.5'];
  let ok = true;
  let bad = '';
  for (const c of cases) {
    if (m.hexDecode(m.hexEncode(c)) !== c) {
      ok = false;
      bad = c;
    }
  }
  check('hex round trip, ASCII', ok, ok ? `${cases.length} cases` : `failed on ${bad}`);

  const h = m.hexEncode('{}"[],; \\ 0.5');
  check(
    'hex output is even-length [0-9a-f]',
    h.length % 2 === 0 && /^[0-9a-f]*$/.test(h),
    `${h.slice(0, 24)}...`,
  );
}

// ───────────────────────── unicode safety ─────────────────────────

{
  const m = loadMap();
  const payload = { a: '/x—é日' }; // em-dash, e-acute, CJK
  const json = JSON.stringify(payload);

  const folded = m.asciiFold(json);
  check('asciiFold output is pure ASCII', /^[\x00-\x7f]*$/.test(folded), folded);

  const back = JSON.parse(m.hexDecode(m.hexEncode(folded)));
  eq('unicode survives fold+hex+parse', back, payload);

  // the bug this replaced: hexEncode alone emits 3-4 digits for a code point above
  // 0xff, which desynchronises the fixed-width decoder for the rest of the payload
  const unfolded = m.hexDecode(m.hexEncode(json));
  check(
    'unfolded hex would have corrupted it',
    unfolded !== json,
    unfolded === json ? 'no corruption — fold is not needed?' : 'corrupts, as expected',
  );
}

// ───────────────────────── chunking ─────────────────────────

{
  const m = loadMap();
  const sizes = [0, 1, m.CHUNK - 1, m.CHUNK, m.CHUNK + 1, m.CHUNK * 2 + 7];
  let ok = true;
  let bad = '';
  for (const n of sizes) {
    const h = 'ab'.repeat(Math.ceil(n / 2)).slice(0, n);
    if (m.unchunkHex(m.chunkHex(h)) !== h) {
      ok = false;
      bad = String(n);
    }
  }
  check('chunk round trip', ok, ok ? `sizes ${sizes.join(',')}` : `failed at ${bad}`);

  const parts = m.chunkHex('0'.repeat(m.CHUNK * 2 + 7));
  check('chunk count and size', parts.length === 3
    && parts.every((part) => part.length <= m.CHUNK + 1), `${parts.length} atoms`);
  // an all-digit atom would be parsed as a number by Max and rounded away
  check(
    'no chunk is all digits',
    parts.every((part) => !/^[0-9]+$/.test(part)),
    parts.map((part) => part.slice(0, 3)).join(' '),
  );
  eq('empty payload is still one atom', m.chunkHex('').length, 1);
}

// ───────────────────────── state round trip ─────────────────────────

{
  const m = loadMap();
  seed(m, [{}, {}], '');
  m.setvalueof.apply(null, m.getvalueof());
  eq('empty state round trips', [m.maps, m.hostAddr, m.ports], [[{}, {}], '', [52000, 52001]]);
}

{
  const m = loadMap();
  // note 36 mapped on BOTH layers, to different addresses — proves they don't collide
  seed(m, [
    {
      36: { address: '/on/thirtysix', args: 'f:1 hello' },
      60: { address: '/on/sixty', args: '' },
    },
    { 36: { address: '/off/thirtysix', args: 'i:2' } },
  ], '10.0.0.42', [52010, 52011]);
  const before = JSON.stringify([m.maps, m.hostAddr, m.ports]);

  const atoms = m.getvalueof();
  seed(m, [{}, {}], '');
  m.setvalueof.apply(null, atoms);

  eq(
    'populated state round trips',
    JSON.parse(JSON.stringify([m.maps, m.hostAddr, m.ports])),
    JSON.parse(before),
  );
  eq('both layers restored', m.countAll(), 3);
  eq('v3 round-trips both transport ports intact', m.ports, [52010, 52011]);
}

// ───────────────────────── end to end, the path that was broken ─────────────────────────

{
  const m = loadMap();
  m.init(); // sets deviceReady, so the repaint gets deferred
  m.selected = 36;
  m.mode = 0;
  m.pendingAddress = '  /sndwrks/server/v1/confetti  ';
  m.pendingArgs = 'f:1 i:2 hello';
  m.doset();

  const atoms = m.getvalueof();
  m._reset();
  m.pushColl(0);
  const collBefore = m._calls.slice();

  seed(m, [{}, {}], '');
  m._reset();
  m.setvalueof.apply(null, atoms);

  check(
    'setvalueof touches no outlet',
    m._calls.length === 0,
    `${m._calls.length} outlet call(s), ${m._tasks.length} deferred task(s)`,
  );
  eq('restored one mapping', m.countAll(), 1);

  m._reset();
  m.pushColl(0);
  eq('coll lines identical after restore', m._calls, collBefore);
  eq('address was trimmed on store', m.maps[0][36].address, '/sndwrks/server/v1/confetti');
}

// ───────────────────────── rejection ─────────────────────────

{
  const m = loadMap();
  const cases = [
    ['no atoms', []],
    ['empty atom', ['']],
    ['non-hex garbage', ['garbage']],
    ['hex but not JSON', ['h5b31']],
    ['valid JSON, wrong version', [`h${m.hexEncode('[1,[],[],""]')}`]],
  ];
  for (const [name, atoms] of cases) {
    seed(m, [{ 36: { address: '/stale', args: '' } }, {}], 'stale.host');
    m._reset();
    m.setvalueof.apply(null, atoms);
    const clean = m.countAll() === 0 && m.hostAddr === '';
    check(`rejects ${name}`, clean, `${m._posts.length} log line(s), ${m.countAll()} mapping(s)`);
  }
  // silent recovery is how this class of bug hides — the log has to say something
  seed(m, [{}, {}], '');
  m._reset();
  m.setvalueof('h5b31');
  check(
    'bad JSON is logged, not swallowed',
    m._posts.some((line) => /not valid JSON/.test(line)),
    `${m._posts.length} line(s)`,
  );
  m._reset();
  m.setvalueof(`h${m.hexEncode('[1,[],[],""]')}`);
  check(
    'wrong version is logged',
    m._posts.some((line) => /not a valid v2 or v3 mapping table/.test(line)),
    `${m._posts.length} line(s)`,
  );
}

// ───────────────────────── deserialize validation ─────────────────────────

{
  const m = loadMap();
  const got = m.deserialize([2, [
    [-1, '/negative', ''],
    [128, '/too-high', ''],
    [36, 'no-leading-slash', ''],
    [37, '/keep/me', 'f:1'],
  ], [], 'h.host']);
  eq(
    'drops out-of-range notes and bad addresses',
    JSON.parse(JSON.stringify(got)),
    {
      maps: [{ 37: { address: '/keep/me', args: 'f:1' } }, {}],
      host: 'h.host',
      ports: [52000, 52001],
    },
  );
}

// ───────────────────────── v2 -> v3 upgrade path ─────────────────────────

{
  const m = loadMap();
  // a v2 payload has no ports element at all -- this is what every Live Set saved
  // before this feature shipped looks like, and it must not orphan them
  const v2 = m.deserialize([2, [[36, '/on/thirtysix', '']], [], '10.0.0.42']);
  eq('v2 payload restores', v2.maps[0][36].address, '/on/thirtysix');
  eq('v2 payload yields default ports', v2.ports, [52000, 52001]);

  // and the same thing through the full hex round trip, which is the path an actual
  // Live Set saved under v2 would take through setvalueof()
  const v2Hex = `h${m.hexEncode(m.asciiFold(JSON.stringify(
    [2, [[36, '/on/thirtysix', '']], [], '10.0.0.42'],
  )))}`;
  seed(m, [{}, {}], '');
  m._reset();
  m.setvalueof(v2Hex);
  eq('v2 payload restores through setvalueof', m.maps[0][36].address, '/on/thirtysix');
  eq('v2 payload restores host', m.hostAddr, '10.0.0.42');
  eq('v2 payload yields default ports through setvalueof', m.ports, [52000, 52001]);
}

{
  const m = loadMap();
  // a v3 payload with a corrupt ports element degrades to defaults, not NaN
  const bad = m.deserialize([3, [], [], '10.0.0.42', ['not-a-number', 70000]]);
  eq('corrupt v3 ports degrade to defaults, not NaN', bad.ports, [52000, 52001]);

  const partial = m.deserialize([3, [], [], '10.0.0.42', [52222, 'nope']]);
  eq('a valid port survives even when its sibling is corrupt', partial.ports, [52222, 52001]);
}

// ───────────────────────── coll line generation ─────────────────────────

{
  const m = loadMap();
  seed(m, [{
    36: { address: '/a/b', args: '' },
    7: { address: '/c/d', args: '1 2.5 hello' },
  }, {}], '');
  m._reset();
  m.pushColl(0);
  eq('coll starts with clear', m._calls[0], [0, 'clear']);
  // "store 07" would be a different coll index — parseInt matters
  check(
    'no zero padding on the index',
    m._calls.some((call) => call[1] === 'store 7 /c/d 1 2.5 hello'),
    JSON.stringify(m._calls.map((call) => call[1])),
  );
  check(
    'no-args entry has no trailing args',
    m._calls.some((call) => call[1] === 'store 36 /a/b'),
    'ok',
  );
}

// ───────────────────────── forced argument types ─────────────────────────

{
  const m = loadMap();
  // the same three cases roundtrip.test.js:76-78 asserts on the TCP path. Asserting
  // both is what actually proves the file's claim that the transports agree.
  eq('forced float f:1', m.argText('f:1'), '1.0');
  eq('forced int i:2.7', m.argText('i:2.7'), '2');
  eq('forced string s:1', m.argText('s:1'), '"1"');
  eq('bare tokens untouched', m.argText('1 1.5 hello'), '1 1.5 hello');
  eq('runs of spaces collapse', m.argText('1   2'), '1 2');
  eq('empty args', [m.argText(''), m.argText(undefined)], ['', '']);
}

// ───────────────────────── lifecycle ─────────────────────────

{
  const m = loadMap();
  seed(m, [{ 36: { address: '/a/b', args: '' } }, {}], '10.0.0.42');
  m._reset();
  m.init();
  const first = m._calls.slice();
  m._reset();
  m.init();
  eq('init is idempotent', m._calls, first);

  check(
    'init pushes the restored host both ways',
    first.some((call) => call[0] === 7 && call[1] === 'set' && call[2] === '10.0.0.42')
    && first.some((call) => call[0] === 6 && call[1] === 'host' && call[2] === '10.0.0.42'),
    'outlets 6 and 7',
  );
  check(
    'init pushes the restored port both ways',
    first.some((call) => call[0] === 8 && call[1] === 'set' && call[2] === 52000)
    && first.some((call) => call[0] === 6 && call[1] === 'port' && call[2] === 52000),
    'outlets 6 and 8',
  );
}

{
  const m = loadMap();
  seed(m, [{}, {}], '');
  // before the device is ready, setvalueof must not paint AND must not defer —
  // [live.thisdevice] -> [init( is what will paint, and it has not fired yet
  m._reset();
  m.setvalueof.apply(null, m.getvalueof());
  eq('no paint, no defer before deviceReady', [m._calls.length, m._tasks.length], [0, 0]);

  m.init();
  m._reset();
  m.setvalueof.apply(null, m.getvalueof());
  eq(
    'defers exactly one repaint after deviceReady',
    [m._calls.length, m._tasks.length],
    [0, 1],
  );
  m._tasks[0]();
  check('the deferred task does paint', m._calls.length > 0, `${m._calls.length} outlet call(s)`);
}

{
  const m = loadMap();
  m.init();
  m.selected = 36;
  m.mode = 0;
  m.pendingAddress = '/a/b';
  m.pendingArgs = '';

  m._reset();
  m.doset();
  eq('doset notifies', m._notified, 1);
  m._reset();
  m.dodelete();
  eq('dodelete notifies', m._notified, 1);
  m._reset();
  m.clearall();
  eq('clearall notifies', m._notified, 1);
  m._reset();
  m.getvalueof();
  eq('getvalueof does not notify', m._notified, 0);
  m._reset();
  m.setvalueof('');
  eq('setvalueof does not notify', m._notified, 0);

  m._reset();
  m.host('10.0.0.42');
  eq('host change notifies', [m._notified, m.hostAddr], [1, '10.0.0.42']);
  eq(
    'host change reaches the transports with both host and port',
    m._calls,
    [[6, 'host', '10.0.0.42'], [6, 'port', 52000]],
  );
  m._reset();
  m.host('10.0.0.42');
  eq('unchanged host is not re-sent', [m._notified, m._calls.length], [0, 0]);
}

// ───────────────────────── host:port splitting ─────────────────────────

{
  const m = loadMap();
  // splitHostPort() is pure and has no side effects -- exercise it directly first
  eq(
    'splits host and port apart',
    m.splitHostPort('10.0.0.42:52123'),
    { host: '10.0.0.42', port: 52123 },
  );
  eq('leaves a bare IPv6 literal alone', m.splitHostPort('::1'), { host: '::1', port: null });
  eq(
    'leaves a hostname with no port alone',
    m.splitHostPort('studio.local'),
    { host: 'studio.local', port: null },
  );
}

{
  const m = loadMap();
  // a pasted "host:port" now gets USED, not stripped -- both halves are stored and
  // pushed back to their own fields (outlets 7 and 8), and outlet 6 carries both to
  // the transports
  m._reset();
  m.host('10.0.0.42:52123');
  eq('splitting sets the host', m.hostAddr, '10.0.0.42');
  eq('splitting sets the active transport port', m.ports[m.transport], 52123);
  check(
    'reaches both UI outlets',
    m._calls.some((call) => call[0] === 7 && call[1] === 'set' && call[2] === '10.0.0.42')
    && m._calls.some((call) => call[0] === 8 && call[1] === 'set' && call[2] === 52123),
    JSON.stringify(m._calls),
  );
  check(
    'and both halves reach the transports',
    m._calls.some((call) => call[0] === 6 && call[1] === 'host' && call[2] === '10.0.0.42')
    && m._calls.some((call) => call[0] === 6 && call[1] === 'port' && call[2] === 52123),
    JSON.stringify(m._calls),
  );
  eq('splitting a host:port notifies', m._notified, 1);

  m._reset();
  m.host('10.0.0.42');
  eq('leaves a bare address alone', m.hostAddr, '10.0.0.42');
  m._reset();
  m.host('studio.local');
  eq('leaves a hostname alone', m.hostAddr, 'studio.local');
  m._reset();
  m.host('::1');
  eq(
    'leaves an IPv6 literal alone, port untouched',
    [m.hostAddr, m.ports[m.transport]],
    ['::1', 52123],
  );
  m._reset();
  m.host('  10.0.0.9  ');
  eq('trims whitespace', m.hostAddr, '10.0.0.9');

  m._reset();
  const beforePort = m.ports[m.transport];
  m.host('10.0.0.42:99999');
  eq(
    'an out-of-range pasted port is rejected, host still applies',
    m.ports[m.transport],
    beforePort,
  );
  eq('host half still applies even when the port half is rejected', m.hostAddr, '10.0.0.42');
}

// ───────────────────────── port field ─────────────────────────

{
  const m = loadMap();
  m._reset();
  m.port('52010');
  eq('sets the active transport port', m.ports[0], 52010);
  eq('port change notifies', m._notified, 1);
  eq(
    'port change reaches the transports',
    m._calls,
    [[6, 'host', ''], [6, 'port', 52010]],
  );

  const bad = ['abc', '', '1.5', '0', '65536', '-5', '520 00'];
  for (const text of bad) {
    m._reset();
    const before = m.ports.slice();
    const beforeHost = m.hostAddr;
    m.port(text);
    eq(`rejects "${text}" without touching stored ports`, m.ports, before);
    eq(`rejects "${text}" without touching stored host`, m.hostAddr, beforeHost);
    eq(`rejects "${text}" without notifying`, m._notified, 0);
    eq(`rejects "${text}" without an outlet call`, m._calls.length, 0);
  }

  m._reset();
  m.port('52010'); // same as what is already stored
  eq('re-setting the same port is a no-op', [m._notified, m._calls.length], [0, 0]);
}

// ───────────────────────── settransport ─────────────────────────

{
  const m = loadMap();
  seed(m, [{}, {}], '10.0.0.42', [52000, 52001]);
  eq('starts on udp', m.transport, 0);

  m._reset();
  m.settransport(1);
  eq('switches the active transport', m.transport, 1);
  eq(
    'swaps the PORT field to the tcp port and re-emits host + port on outlet 6',
    m._calls,
    [[8, 'set', 52001], [6, 'host', '10.0.0.42'], [6, 'port', 52001]],
  );

  m._reset();
  m.settransport(0);
  eq(
    'and back to udp',
    m._calls,
    [[8, 'set', 52000], [6, 'host', '10.0.0.42'], [6, 'port', 52000]],
  );
  eq('settransport does not itself notify -- it is not a persisted change', m._notified, 0);
}

// ───────────────────────── grid protocol ─────────────────────────

{
  const m = loadMap();
  seed(m, [
    { 36: { address: '/on/a', args: '' }, 40: { address: '/on/b', args: '' } },
    { 41: { address: '/off/a', args: '' } },
  ], '');
  m.mode = 0;
  m.selected = 40;

  m._reset();
  m.refreshGrid();
  // every atom goes out as a selector plus at most ONE scalar argument. the two forms
  // this replaces both left the shipped grid completely inert -- no mapped cells AND
  // no selection ring:
  //   outlet.apply(null, atoms)              -> "error calling function <caller>",
  //                                             because outlet() is a host builtin
  //   outlet(OUT_GRID, ['mapped', 36, 40])   -> one Array argument, the workaround for
  //                                             that, which did not survive [js] -> [v8ui]
  // both passed here, because the stub below is an ordinary JS function that accepts
  // .apply and records whatever it is handed. assert the scalar shape instead, and do
  // not "simplify" this back into one variable-length message.
  eq('selected goes out first, so the ring is the canary', m._calls[0], [2, 'selected', 40]);
  eq('clearmapped resets the grid before the notes arrive', m._calls[1], [2, 'clearmapped']);
  eq(
    'one mapnote per mapped note in the current layer',
    m._calls.slice(2),
    [[2, 'mapnote', 36], [2, 'mapnote', 40]],
  );

  // switching layers changes which notes are "mapped" -- 41 belongs to note-off, not
  // note-on, and must not leak across the seam
  m._reset();
  m.setmode(1);
  eq(
    'layer switch reports only that layer\'s mapped notes',
    m._calls.filter((call) => call[1] === 'mapnote'),
    [[2, 'mapnote', 41]],
  );

  // an empty layer still resets the grid, rather than sending nothing at all and
  // leaving the previous layer's cells lit
  m._reset();
  m.clearall();
  check(
    'an empty layer still sends clearmapped, and no mapnote',
    m._calls.some((call) => call[0] === 2 && call[1] === 'clearmapped')
    && !m._calls.some((call) => call[1] === 'mapnote'),
    JSON.stringify(m._calls),
  );

  // a click routes straight through selectnote() -- there is no more list()
  // wrapper, and no diffing: every call is the full mapped set plus selected
  m._reset();
  m.selectnote(36);
  eq('selectnote has no leftover matrixctrl-era handler', typeof m.list, 'undefined');
  check(
    'selectnote re-sends the full mapped set and the new selection',
    m._calls.some((call) => call[0] === 2 && call[1] === 'selected' && call[2] === 36)
    && m._calls.some((call) => call[0] === 2 && call[1] === 'clearmapped'),
    JSON.stringify(m._calls),
  );
}

// same summary + exit code as roundtrip.test.js. without it this file printed FAIL
// lines and still exited 0, so `npm test` reported success over a broken build --
// which is how the grid protocol above could regress unnoticed.
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
