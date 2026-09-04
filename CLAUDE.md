# ableton-osc

A Max for Live MIDI effect that maps notes to OSC. There is no app and no server:
a `.amxd` device, four JavaScript files that run *inside Max*, and a Python script
that generates the device.

## Commands

```bash
python3 build-patch.py   # regenerate sndwrks-osc.maxpat AND sndwrks-osc.amxd
npm run lint             # eslint IS the formatter here — no Prettier, no Biome
npm test                 # roundtrip + mapping + install suites
./install.command        # copy the payload into Live's User Library
```

`npm test` includes `install.test.js`, which only executes on macOS and prints a skip
everywhere else. That skip is why one `npm test` works on both CI runners.

## Three JavaScript runtimes, three sets of rules

The single most important thing to get right. Each file runs in a different Max
object with a different engine:

| File | Object | Engine |
|---|---|---|
| `sndwrksMap.js` | `[js]` | ES5 only. Top-level `var`. |
| `sndwrksGrid.js`, `sndwrksLogo.js` | `[v8ui]` | V8 — ES6+ is fine. |
| `sndwrksTcp.js` | `[node.script]` | Node bundled inside Max (Live 12 ships Node 22). CommonJS. |

`sndwrksMap.js` uses top-level `var` for two reasons, and the second outlives the
first: `[js]` is ES5-only, *and* `mapping.test.js` runs the file unmodified inside a
`vm` context, reaching `hexEncode`, `serialize`, `doset` and `maps` as context
properties. Top-level `let`/`const` do not become context properties, so switching
would leave the harness with nothing to reach and no shipped file to export from.

`eslint.config.mjs` is split along the same lines: Node globals for the Node-hosted
files, Max globals (`outlet`, `post`, `mgraphics`, `box`, …) plus `no-unused-vars`
off for the Max-hosted ones, because Max calls every top-level function by name as a
message handler and ESLint cannot see that.

## Git workflow

**`main` is protected — never push directly to it.** All changes go through pull
requests. Branch off main as `main.<feature>`, with an optional sub-branch:
`main.<feature>.<sub-branch>`.

```
main.<feature>  →  PR  →  main  →  merge into release  →  release workflow
```

Opening the PR against `main` runs lint, all three test suites and `build-patch.py`.
Merging `main` into `release` and pushing builds the zip and publishes the release.

**Always use the `/commit` skill when committing** rather than constructing commit
commands by hand.

## Generated files

`sndwrks-osc.maxpat` and `sndwrks-osc.amxd` are **output**. Edit `build-patch.py` and
regenerate. The script asserts what is easy to break by hand — dangling cords, unique
parameter names, whole-pixel rects, Live's fixed 169px height ceiling, and the pattr
metadata persistence depends on.

`build-patch.py` bakes `creationdate`/`modificationdate` into the patch, so it is not
byte-reproducible. CI proves it still runs; comparing its output against the committed
device is a false alarm waiting to happen.

## Grid protocol

Send a selector plus **at most one scalar** per `outlet()` call to `[v8ui]`. Passing a
JS Array (`outlet(OUT_GRID, ['mapped', 36, 40])`) takes down the whole calling function
silently — every later line in it, including unrelated messages, simply never runs. This
cost a full debugging session and produced no error. `pushColl()` avoids variable-length
lists the same way, via `[fromsymbol]`.

## Hard constraints

- **Zero runtime dependencies.** `dependencies` stays `{}`. Native modules are the
  documented way to break a frozen `.amxd`, and `osc` (osc.js) can pull in serialport.
  Dev tooling in `devDependencies` is fine.
- **The device is not frozen.** It resolves the four scripts through Max's search path
  at load time, so all six files (device, four scripts, `package.json`) ship and install
  together. When `[js]`/`[v8ui]` cannot find its file it loads with one outlet and
  *discards* the cords to the missing ones — permanently, until the patch is reloaded.
- **`install.command` is macOS-only and bash 3.2.** That is what macOS ships. Under
  `set -u`, iterating an empty array is an error there; check `${#arr[@]}` first.
- **The release payload's `package.json` is generated** from this repo's in
  `.github/workflows/release.yml`. Keep one manifest.

## NOTES.md

[NOTES.md](NOTES.md) holds the architecture, the `.amxd` container byte layout, the
full persistence mechanism, and a table of Max and Live behaviours that fail silently.
Read it before touching persistence, the pattr parameter, the `.amxd` container, the
`v8ui` objects, or anything whose symptom is "no error, just nothing happened".
