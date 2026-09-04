/**
 * Same wire, spoken from the other end — 2026-09-03T00:00:00Z
 *
 * OSC over TCP for the sndwrks Max for Live device.
 *
 * The serializer below writes OSC 1.0 messages -- address, comma-led type tag
 * string, then the arguments, each part null-terminated and padded out to a
 * multiple of four bytes. The framer wraps each message in double-ended SLIP
 * (RFC 1055), which is how OSC 1.1 delimits messages on a stream transport.
 * Both are small enough to keep in-tree rather than take a dependency for.
 *
 * Plain JS, no npm dependencies. Native modules are the documented way to break a
 * frozen .amxd, and `osc` (osc.js) can pull in serialport.
 */

const net = require('net');

const maxApi = require('max-api');

// ─────────────────────────── OSC serialization ───────────────────────────
// OSC 1.0 wire format: every part null-terminated and padded to 4 bytes

function padToMultipleOf4 (size) {
  return Math.ceil(size / 4) * 4;
}

function createOSCString (string) {
  const buffer = Buffer.from(`${string}\0`, 'utf8');
  const paddedSize = padToMultipleOf4(buffer.length);
  const result = Buffer.alloc(paddedSize);
  buffer.copy(result);
  return result;
}

const TYPE_SERIALIZERS = {
  i: (value) => {
    const buffer = Buffer.alloc(4);
    buffer.writeInt32BE(value);
    return buffer;
  },
  f: (value) => {
    const buffer = Buffer.alloc(4);
    buffer.writeFloatBE(value, 0);
    return buffer;
  },
  s: (value) => createOSCString(value),
  b: (value) => {
    const blob = Buffer.isBuffer(value) ? value : Buffer.from(value);
    const sizeBuffer = Buffer.alloc(4);
    sizeBuffer.writeUInt32BE(blob.length, 0);

    const paddedSize = padToMultipleOf4(blob.length);
    const paddedBlob = Buffer.alloc(paddedSize);
    blob.copy(paddedBlob);

    return Buffer.concat([sizeBuffer, paddedBlob]);
  },
  h: (value) => {
    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64BE(BigInt(value), 0);
    return buffer;
  },
  d: (value) => {
    const buffer = Buffer.alloc(8);
    buffer.writeDoubleBE(value, 0);
    return buffer;
  },
  T: () => Buffer.alloc(0), // true - no data
  F: () => Buffer.alloc(0), // false - no data
  N: () => Buffer.alloc(0), // null - no data
  I: () => Buffer.alloc(0), // impulse/infinitum - no data
  m: (value) => {
    const buffer = Buffer.alloc(4);
    const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
    bytes.copy(buffer, 0, 0, Math.min(4, bytes.length));
    return buffer;
  },
  r: (value) => {
    const buffer = Buffer.alloc(4);
    buffer.writeUInt8(value.r || 0, 0);
    buffer.writeUInt8(value.g || 0, 1);
    buffer.writeUInt8(value.b || 0, 2);
    buffer.writeUInt8(Math.round((value.a || 1) * 255), 3);
    return buffer;
  },
};

function isOSCType (type) {
  return Object.hasOwn(TYPE_SERIALIZERS, type);
}

function serializeOSCMessage (data) {
  const buffers = [];

  buffers.push(createOSCString(data.address));

  const typeTag = `,${data.args.map((arg) => arg.type).join('')}`;
  buffers.push(createOSCString(typeTag));

  for (const arg of data.args) {
    if (isOSCType(arg.type)) {
      buffers.push(TYPE_SERIALIZERS[arg.type](arg.value));
    } else {
      maxApi.post(`unsupported OSC type: ${arg.type}`);
    }
  }

  return Buffer.concat(buffers);
}

// ─────────────────────────── SLIP framing ───────────────────────────
// double-ended SLIP (RFC 1055), the OSC 1.1 stream framing

const SLIP_END = 0xC0;
const SLIP_ESC = 0xDB;
const SLIP_ESC_END = 0xDC;
const SLIP_ESC_ESC = 0xDD;

function encodeSlipFrame (buffer) {
  const escaped = [];

  for (let i = 0; i < buffer.length; i += 1) {
    if (buffer[i] === SLIP_END) {
      // replace SLIP_END with SLIP_ESC + SLIP_ESC_END
      escaped.push(SLIP_ESC);
      escaped.push(SLIP_ESC_END);
    } else if (buffer[i] === SLIP_ESC) {
      // replace SLIP_ESC with SLIP_ESC + SLIP_ESC_ESC
      escaped.push(SLIP_ESC);
      escaped.push(SLIP_ESC_ESC);
    } else {
      escaped.push(buffer[i]);
    }
  }

  // wrap with SLIP_END delimiters.
  //
  // both delimiters matter. extractSlipFrames() slices subarray(start + 1, i),
  // so it assumes a leading 0xC0 and skips one byte unconditionally. a frame sent
  // with only a trailing END still passes hasValidSLipStructure(), then silently
  // loses its first payload byte.
  return Buffer.from([SLIP_END, ...escaped, SLIP_END]);
}

function encodeFrame (buffer, framingType) {
  if (framingType === 'slip') {
    return encodeSlipFrame(buffer);
  }

  maxApi.post(`unknown framing type: ${framingType}`);
  return buffer;
}

// ─────────────────────────── Max atoms -> OSC args ───────────────────────────

/**
 * Max hands us atoms, not typed OSC values, so the type tag has to be inferred.
 * Prefixes match sndwrksMap.js so both transports agree:
 *   f:1 -> float   i:2 -> int   s:1 -> string
 *
 * Worth knowing: JavaScript has one number type, so a Max float atom of 1.0
 * arrives here as 1 and is indistinguishable from an int. Use f: when a receiver
 * cares about the distinction — which for a lighting console it usually does.
 */
function toOSCArgs (atoms) {
  const args = [];

  for (const atom of atoms) {
    if (typeof atom === 'number') {
      args.push({ type: Number.isInteger(atom) ? 'i' : 'f', value: atom });
      continue;
    }

    const token = String(atom);
    const forced = (
      token.length > 2 && token.charAt(1) === ':' && 'ifs'.indexOf(token.charAt(0)) >= 0
    ) ? token.charAt(0) : null;
    const body = forced ? token.substring(2) : token;

    if (forced === 'i') {
      args.push({ type: 'i', value: parseInt(body, 10) || 0 });
    } else if (forced === 'f') {
      args.push({ type: 'f', value: parseFloat(body) || 0 });
    } else if (forced === 's') {
      args.push({ type: 's', value: body });
    } else if (body !== '' && !Number.isNaN(Number(body))) {
      const numeric = Number(body);
      args.push({ type: Number.isInteger(numeric) ? 'i' : 'f', value: numeric });
    } else {
      args.push({ type: 's', value: body });
    }
  }

  return args;
}

// ─────────────────────────── connection ───────────────────────────

const RECONNECT_DELAY_MS = 2000;
const MAX_QUEUED_FRAMES = 64;

let host = '127.0.0.1';
let port = 52001; // the server's default network-server TCP port
let socket = null;
let isConnected = false;
let reconnectTimer = null;
let queue = [];

function connect () {
  if (socket) {
    socket.removeAllListeners();
    socket.destroy();
  }

  socket = new net.Socket();
  socket.setNoDelay(true); // nagle would coalesce cues. never do that on a go.

  socket.on('connect', () => {
    isConnected = true;
    maxApi.outlet('connected', 1);
    maxApi.post(`connected to ${host}:${port}`);

    const pending = queue;
    queue = [];
    for (const frame of pending) socket.write(frame);
  });

  socket.on('error', (error) => {
    maxApi.post(`socket error: ${error.message}`);
  });

  socket.on('close', () => {
    if (isConnected) maxApi.outlet('connected', 0);
    isConnected = false;
    scheduleReconnect();
  });

  socket.connect(port, host);
}

function scheduleReconnect () {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, RECONNECT_DELAY_MS);
}

function send (address, atoms) {
  if (typeof address !== 'string' || address.charAt(0) !== '/') {
    maxApi.post(`ignoring non-OSC message: ${address}`);
    return;
  }

  const frame = encodeFrame(
    serializeOSCMessage({ address, args: toOSCArgs(atoms) }),
    'slip',
  );

  if (isConnected && socket) {
    socket.write(frame);
    return;
  }

  // bounded — an unbounded queue across a long disconnect is a burst of stale
  // cues the moment the server comes back
  queue.push(frame);
  if (queue.length > MAX_QUEUED_FRAMES) queue.shift();
}

// ─────────────────────────── Max handlers ───────────────────────────

maxApi.addHandler('host', (value) => {
  host = String(value);
  connect();
});
maxApi.addHandler('port', (value) => {
  port = Number(value);
  connect();
});
maxApi.addHandler('reconnect', () => connect());

// set to 0 once this is behaving
let DEBUG = 1;

maxApi.addHandler('debug', (value) => {
  DEBUG = Number(value) ? 1 : 0;
});

/**
 * The ALL selector's callback signature is not pinned down in the Node for Max
 * reference, and it does NOT simply start with the message name — it arrives with
 * a leading boolean, and that boolean is a "handled" flag: true means one of the
 * named handlers above (host, port, reconnect, debug) has already consumed the
 * message, false means nothing did.
 *
 * ALL fires for *every* message, handled or not. Without the flag check, each
 * `host localhost` and `port 52001` reached here as [true, 'host', 'localhost'],
 * found no OSC address, and logged a "no OSC address found" line for a message
 * that had in fact been handled correctly a moment earlier.
 *
 * Past the flag, drop any leading non-string atoms until the OSC address is in
 * hand, rather than depending on which shape a given Max build uses.
 */
function dispatch (incoming) {
  if (DEBUG) maxApi.post(`raw: ${JSON.stringify(incoming)}`);

  const atoms = incoming.slice();
  while (atoms.length && !(typeof atoms[0] === 'string' && atoms[0].charAt(0) === '/')) {
    atoms.shift();
  }

  if (!atoms.length) {
    maxApi.post(`no OSC address found in: ${JSON.stringify(incoming)}`);
    return;
  }

  send(atoms[0], atoms.slice(1));
}

// deterministic path: put [prepend osc] before node.script and this fires instead,
// with no reliance on the ALL signature at all.
maxApi.addHandler('osc', (...incoming) => dispatch(incoming));

maxApi.addHandler(maxApi.MESSAGE_TYPES.ALL, (...incoming) => {
  // already consumed by a named handler above -- not ours, and never an OSC address
  if (incoming[0] === true) return;
  dispatch(incoming);
});

connect();

module.exports = {
  createOSCString,
  encodeFrame,
  encodeSlipFrame,
  serializeOSCMessage,
  toOSCArgs,
};
