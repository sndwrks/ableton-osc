# Notes

Implementation detail, and the things that cost real time to work out. The
[README](README.md) is the short version.

## Architecture

**The note path never touches JavaScript.**

```
[midiin] → [midiparse] → [unpack 0 0] → [gate 2] → [coll] → [route symbol]
                                                                 ↓
                                                          [fromsymbol]
                                                                 ↓
                                                    [gate 2] → udpsend / node.script
```

All native, all on Max's high-priority scheduler thread. `[js]`, `[v8]` and `[v8ui]`
defer anything arriving from a MIDI object to the low-priority thread, which is not
where a go cue belongs. `sndwrksMap.js` only ever *writes into* the colls at edit
time; the colls do the runtime lookup themselves.

The `[coll]` objects are the mapping table — an index-addressed store where the index
is the note number and the value is the whole OSC message.

The note grid itself is `[v8ui sndwrksGrid.js]` now, not a bare `matrixctrl` — it owns
its own drawing and hit-testing and reports a click straight to `sndwrksMap.js`'s
`selectnote()`. It has nothing to do with the note path above; it only helps you pick
which note you're editing. Because it redraws wholesale — `clearmapped`, then one
`mapnote <n>` per mapped note, every time — rather than being diffed against, the old
set/clear echo machinery in `sndwrksMap.js` (`lit`, `updating`, `paintCell()`) is gone
entirely, and with it the stack-overflow class of bug that machinery existed to
survive. Those messages each carry a selector and at most one scalar argument on
purpose; see the gotchas table for what happened to the single variable-length
`mapped <n> <n> ...` message they replaced.

### Why `[route symbol] → [fromsymbol]`

A coll entry with an address and **no arguments** comes out as a Max `symbol` message,
not an "anything" message. `udpsend` serialises that faithfully, and the server sees:

```json
{ "address": "symbol", "args": [{ "type": "s", "value": "/sndwrks/server/v1/confetti" }] }
```

`[route symbol]` catches that case and `[fromsymbol]` parses the text back into a real
message with the address as the selector. Everything already well-formed passes through
the right outlet untouched. This matters because **most of the sndwrks OSC API is
no-argument addresses** — `/confetti`, `/estop/engage`, every `/fire`, `/on` and `/off`.

### The `.amxd` container

```
offset  0   "ampf"                      magic
offset  4   04 00 00 00                 uint32 LE, chunk size = 4
offset  8   "mmmm"                      device type (MIDI effect)
offset 12   "meta"
offset 16   04 00 00 00                 uint32 LE, size = 4
offset 20   01 00 00 00                 uint32 LE, meta = 1
offset 24   "ptch"
offset 28   <uint32 LE>                 len(json) + 1
offset 32   <patcher JSON> 00           NUL-terminated
```

The declared length **includes** the terminating NUL — get that wrong by one byte and
Max refuses to load the file. `mmmm` is a MIDI effect; the other device type codes are
`aaaa` (audio effect) and `iiii` (instrument). A **frozen** device carries an
additional `mx@c` chunk on top of this, which is why Freeze can't be scripted from
Python — only Max itself writes that chunk.

`amxd_bytes()` in `build-patch.py` builds this container directly, and every run
round-trips its own output: it re-reads the file it just wrote, confirms the declared
length matches the actual payload byte-for-byte, and confirms the payload parses back
to the identical patcher JSON. That check has passed on every build so far; a real
device drag-and-drop has not yet been tried.

## Transports

| | UDP | TCP |
|---|---|---|
| Port | 52000 (default, editable) | 52001 (default, editable) |
| Object | `[udpsend]` | `[node.script sndwrksTcp.js]` |
| Framing | datagram | SLIP, double-ended |

`sndwrksTcp.js` implements both halves itself rather than taking a dependency, since
`dependencies` stays empty and `osc` (osc.js) can pull in serialport. The serializer
follows OSC 1.0 — address, comma-led type tag string, arguments, each part
null-terminated and padded to a multiple of four bytes. The framer is double-ended
SLIP (RFC 1055), which is how OSC 1.1 delimits messages on a stream transport: a
`0xC0` before and after every message, with `0xC0` and `0xDB` in the payload escaped.
`roundtrip.test.js` decodes what it encodes with a separately written parser, so the
two have to agree with the spec rather than merely with each other.

The SERVER field is shared between transports; each transport remembers its own port,
and the PORT field updates to show whichever one is active. Pasting a full
`host:port` into SERVER is a feature, not a typo to correct — it splits into host and
port, applies the port to the currently-active transport, and pushes both fields back
to show the result.

Your own docs make the choice better than we could: *"Use TCP when you must know it
happened. Use UDP when the next value supersedes the last."*

## Persistence

Mappings, the SERVER host and both transport ports travel with the **Live Set**,
through `[pattr sndwrksMappings]` bound to `[js]` by pattr's middle (client) outlet,
using `getvalueof()` / `setvalueof()` / `notifyclients()`.

### Why it used to lose everything

Two mistakes, both in how the pattr box was written to the file.

**No declared type.** `build-patch.py` emitted the box with no
`saved_attribute_attributes` at all — unlike every `live.*` object, which got its
parameter metadata from `live_param()`. Max defaults `parameter_type` to `0`, Float, and
a Float parameter cannot hold a symbol, so Live dropped the hex payload on save and
`setvalueof` got nothing back.

**`parameter_enable` in the wrong place.** `pattr` is an object box, not a UI object, so
its attributes belong in `saved_object_attributes` — the same slot the colls use. Setting
it at box level (where `live.*` objects keep it) is ignored; setting it as
`@parameter_enable 1` in the object *text* is worse than ignored, because the parameter is
then created at instantiation with the default type before `saved_attribute_attributes`
can say otherwise. The symptom is unmistakable once you have seen it:

```
h5b322c5b5b33362c222f736e6477726b73…: bad number
```

— the hex payload being handed to a numeric parameter. If you see that, the type never
took, whatever `parameter_type` says in the file.

The working shape:

```json
"text": "pattr sndwrksMappings",
"saved_object_attributes": { "parameter_enable": 1 },
"saved_attribute_attributes": { "valueof": {
    "parameter_longname": "sndwrks Mappings", "parameter_shortname": "maps",
    "parameter_type": 3, "parameter_invisible": 1, "parameter_initial_enable": 0 } }
```

`parameter_type: 3` is **Blob**, the type meant for exactly this:

> blob: parameters that cannot be automated but can be stored in presets… Non-automatable
> parameters may be any type of data you can store with a pattr object: single values,
> lists, or strings.
> — [Device Parameters in Max for Live](https://docs.cycling74.com/legacy/max8/vignettes/live_parameters)

and `parameter_invisible: 1` is **Stored Only** — saved, just not automatable. `2` is
*Hidden*, which is neither stored nor automatable and reproduces the same bug from the
other direction.

The earlier diagnosis — "Live parameters are numeric, so a hex symbol is the wrong shape"
— was right about the symptom and wrong about the conclusion. Numeric is the default, not
the only option.

### The evidence trap

`getvalueof()` firing in the console does **not** prove parameter mode works. pattr queries
its client whenever it needs a value, including on an ordinary patcher save, whether or not
`parameter_enable` is set. The only proof that Live has ever seen the parameter is
**View → Parameters**.

### On the wire

```
[ 3, [[36,"/a/b",""], …note-on…], [ …note-off… ], "10.0.0.42", [52000, 52001] ]
```

JSON, ASCII-folded, hex-encoded, split into 8000-character atoms each prefixed `h`.

- **Hex** keeps the payload to a closed `[0-9a-f]` alphabet — braces and quotes would be
  shredded by Max's atom parser.
- **ASCII-folding** (`\uXXXX` escapes) first, because `hexEncode` writes one byte per
  `charCodeAt`, so a single em-dash pasted into an args field would emit 4 hex digits,
  desynchronise the fixed-width decoder, and lose the whole table. `JSON.parse` turns the
  escapes back afterwards, so it is lossless.
- **Triples, not objects** — `[note, address, args]` costs less than `{note, address,
  args}` would per entry. That is what keeps the worst case — every one of 256 slots
  mapped, plus the trailing `[udpPort, tcpPort]` pair — under the
  [32,767-character pattr limit](https://cycling74.com/forums/what-is-the-maximum-size-blob-i-can-store-in-a-pattr).
  `mapping.test.js`'s own size-budget test measures it directly: **27,274 characters in
  4 atoms**, with the port array adding well under 1% of that.
- **The `h` prefix** stops a chunk ever being all digits, which Max's atom parser would
  read as a number and round away.
- **Version 3** adds the trailing `[udpPort, tcpPort]` pair. `deserialize()` still reads
  version 2 (no port array), so a Live Set saved before this feature existed does not
  come back empty — it just falls back to the default ports (52000 / 52001). Only
  `getvalueof()` writes version 3 going forward.

The SERVER field reaches `udpsend` and `node.script` **only through the js** — the
field feeds `[route text] -> [prepend host] -> [js]`, and the js emits both `host <ip>`
and `port <n>` on outlet 6. PORT mirrors this exactly through its own
`[route text] -> [prepend port] -> [js]` chain. That is what makes the host and port it
persists the same ones it actually uses, and it is why pasting a `host:port` string
into SERVER is a feature: `splitHostPort()` applies the port to whichever transport is
currently active and pushes both fields back to show the split result, rather than
letting a stray colon surface as a repeating `getaddrinfo ENOTFOUND` out of the socket.
Switching the udp/tcp tab does **not** call `notifyclients()` — which transport is
active lives in `[bTransport]`'s own Live-restored value, not the persisted blob, so
flipping the tab is not itself a change worth marking the Set dirty over.

`[live.thisdevice]`, not `[loadbang]`, drives `init()`: the former bangs when the *device*
has finished loading, which is after Live has restored parameters. `setvalueof()` itself
never calls `outlet()` — during restore the cords downstream may not be live yet, so it
sets state and defers the repaint via a `Task`. Both are kept, and `init()` is idempotent,
so every load ordering lands correctly.

### Mechanisms that did not work

1. **`js save()` / `embedmessage()`** — writes into the *patcher file*, not the Live Set,
   so edits made inside Live were lost on reopen. Wrong tool.
2. **`pattrstorage`** — the nominal answer, with a well-documented failure mode where
   presets recall in-session then vanish on set reload.

## Ableton platform limits

- **Height is fixed at 169px.** Not negotiable, and `build-patch.py` asserts it.
- **Width now ships correct.** `build-patch.py` emits `devicewidth: 700` directly into
  the `.amxd`, and asserts it matches the layout it built against — no more the old
  silent mismatch where the saved file's width (711) disagreed with what the script
  assumed (640). No manual View → Set Device Width step should be needed, though this
  has not been confirmed against a real drag-and-drop yet.
- **`.amxd` embeds as a copy in a Live Set.** Reinstalling does not update existing sets.
- **VST3/AU is not an option** — Live does not host MIDI-effect plugins.

## Gotchas

Each of these cost real time and none of them produce a useful error.

| Symptom | Cause |
|---|---|
| Device shows the raw patch in Live | "Open in Presentation" is a *patcher* attribute; it does not travel with copied objects. `build-patch.py` now sets it directly in the emitted file, so this should only bite if you're hand-copying boxes between patches |
| Server sees address `symbol` | Bare-address coll entries emit a Max `symbol` message — see [Why `[route symbol]` → `[fromsymbol]`](#why-route-symbol--fromsymbol) |
| TCP frames arrive corrupted | `extractSlipFrames` assumes a **leading** `0xC0` and skips one byte; trailing-only framing silently eats the first payload byte |
| "address must start with /" when you typed one | `textedit` only outputs on Enter or focus loss. Bang it before reading |
| Address arrives as `text /some/addr` | `textedit` prefixes its output with the `text` selector |
| `ignoring non-OSC message: false` | Node for Max's `MESSAGE_TYPES.ALL` callback starts with a boolean, not the message name |
| `no function <name> [file.js]` after fixing a filename | When `[js]`/`[v8ui]` cannot find its file it loads with 1 outlet, and Max **discards** cords to the missing outlets. They do not come back — reload the patch |
| Messages visible on the server, API never fires | The server pins a device's `messageType` from its **first packet** and parses eagerly forever. One malformed first packet mistypes the row permanently. Set Message Type to `osc` in Devices |
| Macro never fires but confetti does | The server's router intercepts `/sndwrks/server` *before* the e-stop and device-enabled gates. `eStop.enableOnStart` defaults **true**, and auto-created devices are `isEnabled: false` |
| `pattr @parameter_enable 1` saves nothing | No `parameter_type` in `saved_attribute_attributes` → defaults to Float, which cannot hold a symbol. Blob is `parameter_type 3` |
| Blob parameter still not stored | `parameter_invisible 2` is *Hidden* — neither stored nor automatable. Stored Only is `1` |
| `getvalueof` fires, so parameter mode must be working | It does not follow. pattr queries its client on any save, `parameter_enable` or not. Check View → Parameters |
| Restored data present but the grid stays dark | `outlet()` from inside `setvalueof()` during restore goes nowhere. Defer it, and trigger `init()` from `live.thisdevice` rather than `loadbang` |
| Mappings blank out after editing the `.js` | `autowatch 1` re-runs the top level and resets state; the next Set save then writes that empty payload over the good one |
| Payload decodes to garbage after a paste | `hexEncode` emits 3-4 digits for any code point ≥ `0x100` and desyncs the fixed-width decoder. ASCII-fold first |
| `<hex payload>: bad number` in the console | The parameter is numeric. `parameter_enable` on an *object box* goes in `saved_object_attributes`; at box level it is ignored, and in the object text it registers the parameter as Float before `parameter_type` is applied |
| Looking for a `v8ui.mxo` and not finding one | There isn't one. A single `v8.mxo` in `C74/extensions/max/` registers **both** the `v8` and `v8ui` classes |
| `[v8ui sndwrksGrid.js]` in the object box does nothing | A `v8ui` box takes its script through the box's **`filename` attribute**, not object-box text the way `[js sndwrksMap.js]` does |
| `max.getcolor()` missing from autocomplete / type checking | It's absent from Max's own TypeScript declarations, but it's real and it works — it's exactly how Ableton's own shipped chrome (`jsui_live_barslider.js`, `theme_constructor.js`) reads Live theme colours |
| Type checker rejects `mgraphics.set_source_rgba(myColorArray)` | The type defs only document the 4-discrete-number form; a single 4-element array works too and both are used in this repo |
| Type checker wants a `Function` as the second argument to `setoutletassist`/`setinletassist` | The type defs are wrong. Every real usage — including this repo's — passes a plain string |
| No Live theme token for the grid's black-key shading | There isn't one. `sndwrksGrid.js` darkens the resolved body colour instead (`shade()`) rather than guessing at a token name |
| After a Live Set reload, the wrong transport's port gets sent down the active gate | Which transport is active lives in `[bTransport]`'s own Live-restored value, not the persisted blob, and a restored `live.tab` does not reliably re-emit its value on load. The patch bangs `bTransport` from the same `loadbang`/`live.thisdevice` sources that drive `init()`, forcing it to re-emit whatever Live actually restored |
| Narrowing the logo strip past its current width letterboxes the wordmark further | With `LOGO_PADDING = 4` held clear on all four sides, the strip must clear `2×4 + 89.0 × ((159 − 2×4) / 435.9) ≈ 38.83px` — derived from the measured letterform bounding box — or `drawWordmark()` in `sndwrksLogo.js` becomes width-limited instead of height-limited. `build-patch.py` checks this, and checks that its `LOGO_PAD` still matches the script's `LOGO_PADDING`, which is why the strip is 40px |
| Wordmark letterforms look clipped along the strip's long edges | At the old 33px the mark filled 32.47 of 33 pixels, so the bowls sat under the `v8ui` object's own 1px border (`border` is an on/off attribute, default 1, with no `bordercolor` — you cannot restyle it). The fix is `LOGO_PADDING` in `sndwrksLogo.js`, which insets the *fit*; `paint()` still fills the whole box, so the padding is lime |
| Grid shows no mapped cells **and** no selection ring | Not two bugs. `refreshGrid()` used to send `outlet(OUT_GRID, ['mapped', 36, 40])` — one JS Array — and the `selected` message on the next line never landed either, so the whole function was going down on that call. Send a selector plus at most one scalar per message, the way `pushColl()` already avoids variable-length lists via `[fromsymbol]`. `sndwrksGrid.js` now has `anything()`/`list()` catch-alls and a `DEBUG` flag so this can never fail silently again |
| `v8ui` mouse coordinates or redraws land in the wrong place | `v8ui` reports these correctly only while an object's **patching and presentation sizes agree** (stated in `v8ui.maxref.xml`). `build-patch.py` checks both `v8ui` boxes for this |
