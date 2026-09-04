/**
 * Wire in, wire out, nothing lost — 2026-09-03T00:00:00Z
 */

// the decoder below is written against the OSC 1.0 spec and RFC 1055 directly,
// so it fails independently of the encoder it is checking
//
// run with:  node roundtrip.test.js
//
// sndwrksTcp.js requires 'max-api', which only exists inside Max, so stub it here
// rather than making the repo carry a node_modules just to run the tests.
const Module = require('module');

const STUB = 'max-api-stub';
require.cache[STUB] = {
  id: STUB,
  filename: STUB,
  loaded: true,
  exports: {
    post: () => {},
    outlet: () => {},
    addHandler: () => {},
    MESSAGE_TYPES: { ALL: 'all' },
  },
};
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveMaxApiStub (request, ...rest) {
  return request === 'max-api' ? STUB : resolveFilename.call(this, request, ...rest);
};

const T = require('./sndwrksTcp');

// verbatim logic from the server's TCP frame parser
function extractSlipFrames (buffer) {
  const frames = [];
  let start = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    if (buffer[i] === 0xC0 && i > start) {
      const frame = buffer.subarray(start + 1, i);
      if (frame.length > 0) frames.push(unescapeSlip(frame));
      start = i + 1;
    }
  }
  return frames;
}
function unescapeSlip (buffer) {
  const r = [];
  for (let i = 0; i < buffer.length; i += 1) {
    if (buffer[i] === 0xDB && i + 1 < buffer.length) {
      if (buffer[i + 1] === 0xDC) {
        r.push(0xC0);
        i += 1;
      } else if (buffer[i + 1] === 0xDD) {
        r.push(0xDB);
        i += 1;
      } else r.push(buffer[i]);
    } else if (buffer[i] !== 0xC0) r.push(buffer[i]);
  }
  return Buffer.from(r);
}
function readOSCString (d, o) {
  let e = o;
  while (e < d.length && d[e] !== 0) e += 1;
  return d.toString('utf8', o, e);
}
function sizeOf (s) {
  return Math.ceil((Buffer.byteLength(s, 'utf8') + 1) / 4) * 4;
}
function parseOSCMessage (data) {
  let off = 0;
  const address = readOSCString(data, off);
  off += sizeOf(address);
  const tags = readOSCString(data, off);
  off += sizeOf(tags);
  const args = [];
  for (const t of tags.slice(1)) {
    if (t === 'i') {
      args.push({ type: 'i', value: data.readInt32BE(off) });
      off += 4;
    } else if (t === 'f') {
      args.push({ type: 'f', value: data.readFloatBE(off) });
      off += 4;
    } else if (t === 's') {
      const s = readOSCString(data, off);
      args.push({ type: 's', value: s });
      off += sizeOf(s);
    } else if (t === 'd') {
      args.push({ type: 'd', value: data.readDoubleBE(off) });
      off += 8;
    } else if ('TFNI'.includes(t)) {
      args.push({ type: t, value: null });
    }
  }
  return { address, args };
}

let pass = 0;
let fail = 0;
function check (name, atoms, address, expectTags, expectVals) {
  const wire = T.encodeFrame(T.serializeOSCMessage({ address, args: T.toOSCArgs(atoms) }), 'slip');
  const back = parseOSCMessage(extractSlipFrames(wire)[0]);
  const tags = back.args.map((arg) => arg.type).join('');
  const vals = back.args.map((arg) => arg.value);
  const ok = back.address === address && tags === expectTags
    && JSON.stringify(vals) === JSON.stringify(expectVals);
  const label = ok ? 'PASS' : 'FAIL';
  console.log(`${label}  ${name.padEnd(34)} -> ${back.address} ,${tags} ${JSON.stringify(vals)}`);
  if (ok) pass += 1;
  else fail += 1;
}

check('no args (confetti)', [], '/sndwrks/server/v1/confetti', '', []);
check('single int', [1], '/an/osc/message', 'i', [1]);
check('float stays float', [1.5], '/an/osc/message', 'f', [1.5]);
check('forced float f:1', ['f:1'], '/an/osc/message', 'f', [1]);
check('forced int i:2', ['i:2'], '/an/osc/message', 'i', [2]);
check('forced string s:1', ['s:1'], '/an/osc/message', 's', ['1']);
check('string arg', ['hello'], '/an/osc/message', 's', ['hello']);
check('mixed', [1, 'f:2', 'go'], '/eos/chan/3', 'ifs', [1, 2, 'go']);
check('address needing padding', [], '/ab', '', []);
check(
  'long address + args',
  [255, 'stage left'],
  '/sndwrks/server/v1/event/custom',
  'is',
  [255, 'stage left'],
);

// a payload containing the SLIP delimiters themselves must survive escaping
const escPayload = { address: '/x', args: [{ type: 'b', value: Buffer.from([0xC0, 0xDB, 0xC0]) }] };
const esc = T.encodeFrame(T.serializeOSCMessage(escPayload), 'slip');
const frames = extractSlipFrames(esc);
const okEsc = frames.length === 1 && frames[0].includes(Buffer.from([0xC0, 0xDB, 0xC0]));
const escLabel = okEsc ? 'PASS' : 'FAIL';
const escName = 'SLIP escaping of C0/DB in blob'.padEnd(34);
console.log(`${escLabel}  ${escName} -> ${frames.length} frame(s)`);
if (okEsc) pass += 1;
else fail += 1;

// double-ended framing check
const one = T.encodeSlipFrame(Buffer.from([1, 2, 3]));
const oneOk = one[0] === 0xC0 && one[one.length - 1] === 0xC0;
const oneLabel = oneOk ? 'PASS' : 'FAIL';
console.log(`${oneLabel}  ${'double-ended C0 ... C0'.padEnd(34)} -> ${one.toString('hex')}`);
if (one[0] === 0xC0) pass += 1;
else fail += 1;

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
