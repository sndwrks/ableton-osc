/**
 * Six files, the right folder, nothing clobbered without asking — 2026-09-04T00:00:00Z
 */

// run with:  node install.test.js
//
// Drives install.command as a subprocess against throwaway destinations. The
// script is macOS-only by design — Live's User Library is a macOS path — so on
// any other platform this suite reports a skip rather than a failure, and the
// macOS CI job is what actually exercises it.
const { spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT = path.join(__dirname, 'install.command');
const PAYLOAD = [
  'sndwrks-osc.amxd',
  'sndwrksMap.js',
  'sndwrksGrid.js',
  'sndwrksLogo.js',
  'sndwrksTcp.js',
  'package.json',
];

if (process.platform !== 'darwin') {
  console.log(`SKIP  install.command is macOS only; this is ${process.platform}`);
  process.exit(0);
}

let pass = 0;
let fail = 0;
const tempDirs = [];

function check (name, ok, detail) {
  const label = ok ? 'PASS' : 'FAIL';
  console.log(`${label}  ${name.padEnd(46)} -> ${detail}`);
  if (ok) pass += 1;
  else fail += 1;
}

function tempDir (prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `sndwrks-${prefix}-`));
  tempDirs.push(dir);
  return dir;
}

// stdio 'pipe' means no tty, which is the branch that must refuse to clobber.
function run (args, env) {
  return spawnSync(SCRIPT, args, {
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env, SNDWRKS_INSTALL_DIR: '', ...env },
  });
}

function digest (file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function listing (dir) {
  return fs.existsSync(dir) ? fs.readdirSync(dir).sort() : [];
}

// A destination Max would never be found in, so the Node-for-Max probe takes its
// "no Max here" branch and the tests never depend on Live being installed.
const NO_MAX = { SNDWRKS_MAX_APP: '/nonexistent/Max.app' };

// 1 — usage
{
  const r = run(['--help'], {});
  const ok = r.status === 0 && /Usage:/.test(r.stdout);
  check('--help exits 0 and prints usage', ok, `status ${r.status}`);
}

// 2 — an unknown flag is refused rather than guessed at
{
  const r = run(['--bogus'], {});
  const ok = r.status === 1 && /unknown option/.test(r.stderr);
  check('unknown flag exits 1', ok, `status ${r.status}`);
}

// 3 — dry run copies nothing
{
  const dest = tempDir('dry');
  const r = run(['--dry-run'], { SNDWRKS_INSTALL_DIR: dest, ...NO_MAX });
  const files = listing(dest);
  const ok = r.status === 0 && files.length === 0;
  check('--dry-run copies nothing', ok, `status ${r.status}, ${files.length} files`);
}

// 4 — clean install, byte for byte
{
  const dest = tempDir('clean');
  const r = run([], { SNDWRKS_INSTALL_DIR: dest, ...NO_MAX });
  const files = listing(dest);
  const complete = PAYLOAD.every((f) => files.includes(f));
  check(
    'clean install copies exactly the payload',
    r.status === 0 && complete && files.length === PAYLOAD.length,
    `status ${r.status}, ${files.length} files`,
  );

  const identical = PAYLOAD.filter((f) => fs.existsSync(path.join(dest, f))
    && digest(path.join(dest, f)) === digest(path.join(__dirname, f)));
  check(
    'installed files are byte-identical',
    identical.length === PAYLOAD.length,
    `${identical.length}/${PAYLOAD.length} match`,
  );
}

// 5 — a destination that does not exist yet is created
{
  const parent = tempDir('mkdir');
  const dest = path.join(parent, 'Presets', 'MIDI Effects', 'Max MIDI Effect');
  const r = run([], { SNDWRKS_INSTALL_DIR: dest, ...NO_MAX });
  check(
    'missing destination is created',
    r.status === 0 && listing(dest).length === PAYLOAD.length,
    `status ${r.status}, ${listing(dest).length} files`,
  );
}

// 6 — a populated destination is not clobbered without permission
{
  const dest = tempDir('collide');
  fs.writeFileSync(path.join(dest, 'sndwrksMap.js'), 'SENTINEL');
  const r = run([], { SNDWRKS_INSTALL_DIR: dest, ...NO_MAX });
  const untouched = fs.readFileSync(path.join(dest, 'sndwrksMap.js'), 'utf8') === 'SENTINEL';
  check('collision with no tty exits 2', r.status === 2, `status ${r.status}`);
  check(
    'declined install leaves files untouched',
    untouched && listing(dest).length === 1,
    `${listing(dest).length} files, sentinel ${untouched ? 'intact' : 'lost'}`,
  );
}

// 7 — --force replaces
{
  const dest = tempDir('force');
  fs.writeFileSync(path.join(dest, 'sndwrksMap.js'), 'SENTINEL');
  const r = run(['--force'], { SNDWRKS_INSTALL_DIR: dest, ...NO_MAX });
  const replaced = digest(path.join(dest, 'sndwrksMap.js'))
    === digest(path.join(__dirname, 'sndwrksMap.js'));
  check('--force replaces existing files', r.status === 0 && replaced, `status ${r.status}`);
}

// 8 — --dest wins over the environment
{
  const flagDest = tempDir('flag');
  const envDest = tempDir('env');
  const r = run(['--dest', flagDest], { SNDWRKS_INSTALL_DIR: envDest, ...NO_MAX });
  check(
    '--dest overrides SNDWRKS_INSTALL_DIR',
    r.status === 0 && listing(flagDest).length === PAYLOAD.length && listing(envDest).length === 0,
    `flag ${listing(flagDest).length}, env ${listing(envDest).length}`,
  );
}

// 9 — an incomplete unzip fails before it copies half a device
{
  const src = tempDir('partial');
  const dest = tempDir('partial-dest');
  fs.copyFileSync(SCRIPT, path.join(src, 'install.command'));
  fs.chmodSync(path.join(src, 'install.command'), 0o755);
  // everything but sndwrksTcp.js and sndwrksGrid.js
  PAYLOAD.filter((f) => f !== 'sndwrksTcp.js' && f !== 'sndwrksGrid.js')
    .forEach((f) => fs.copyFileSync(path.join(__dirname, f), path.join(src, f)));

  const r = spawnSync(path.join(src, 'install.command'), ['--force'], {
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env, SNDWRKS_INSTALL_DIR: dest, ...NO_MAX },
  });
  const named = /sndwrksTcp\.js/.test(r.stderr) && /sndwrksGrid\.js/.test(r.stderr);
  check('missing payload file exits 1 and names it', r.status === 1 && named, `status ${r.status}`);
  const left = listing(dest).length;
  check('failed precheck copies nothing', left === 0, `${left} files`);
}

// 10 — no Max is a warning, not a crash
{
  const dest = tempDir('nomax');
  const r = run([], { SNDWRKS_INSTALL_DIR: dest, ...NO_MAX });
  check(
    'absent Max warns but still installs',
    r.status === 0 && /No Ableton Live or Max found|no Node for Max/.test(r.stdout),
    `status ${r.status}`,
  );
}

// 11 — a Max.app with no Node inside warns about the runtime specifically
{
  const dest = tempDir('emptymax');
  const fakeMax = path.join(tempDir('maxapp'), 'Max.app');
  fs.mkdirSync(fakeMax, { recursive: true });
  const r = run([], { SNDWRKS_INSTALL_DIR: dest, SNDWRKS_MAX_APP: fakeMax });
  check(
    'Max without Node for Max warns, exits 0',
    r.status === 0 && /no Node for Max runtime/.test(r.stdout),
    `status ${r.status}`,
  );
}

// 12 — nothing arrives quarantined
{
  const dest = tempDir('xattr');
  run([], { SNDWRKS_INSTALL_DIR: dest, ...NO_MAX });
  const flagged = PAYLOAD.filter((f) => {
    const x = spawnSync('xattr', [path.join(dest, f)], { encoding: 'utf8' });
    return /com\.apple\.quarantine/.test(x.stdout || '');
  });
  check(
    'no com.apple.quarantine on installed files',
    flagged.length === 0,
    flagged.length ? flagged.join(', ') : 'clean',
  );
}

tempDirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true }));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
