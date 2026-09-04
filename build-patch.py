#!/usr/bin/env python3
# Two more outlets, one real device file — 2026-09-03T22:00:00Z
"""
sndwrks-osc.maxpat / sndwrks-osc.amxd

Changes from v2, all per Ableton's M4L production guidelines:
  - live.* objects for every control, with NO colour attributes set, so they
    inherit dynamic colours and follow the user's Live theme. The v8ui logo is
    a deliberate, documented exception — see the colour check below.
  - Ableton Sans throughout (bundled with Max) for every box's own fontname;
    the patcher-level default_fontname stays "Arial Bold" to match what Live
    itself writes on save, since nothing renders with it once every box sets
    its own.
  - Whole-pixel rects only.
  - Symmetric margins: left-most element 12px from the left edge, right-most
    element 12px from the right edge of a 700px device.
  - No panels. They rendered in front of the controls, and the flat look is
    what got approved anyway.
  - Emits sndwrks-osc.amxd directly (see amxd_bytes() below), so install stops
    being "paste this JSON into Max and hand-tick Open in Presentation".
Engine is untouched: same coll lookup, same route symbol -> fromsymbol fix.
"""
import json
import re
import struct
import time

FONT = "Ableton Sans"
DIM = [0.62, 0.62, 0.64, 1.0]
BRIGHT = [0.94, 0.94, 0.95, 1.0]
HINT = [0.50, 0.50, 0.52, 1.0]
FIELD = [0.118, 0.118, 0.125, 1.0]

W = 700
M = 12                      # margin, both sides
H = 169                      # device height, fixed by Live -- see NOTES.md

# logo strip: the letterform bounding box the converter measured (see
# LOGO_BBOX in sndwrksLogo.js) is 435.9 x 89.0. drawWordmark() there scales
# uniformly by min(innerHeight/bboxWidth, innerWidth/bboxHeight) so the rotated
# mark is limited by box height (the intended fit) rather than box width, the
# strip needs innerWidth >= bboxHeight * (innerHeight / bboxWidth), where inner*
# is the box inset by LOGO_PAD on all four sides:
#   LOGO_W >= 2*LOGO_PAD + 89.0 * ((159 - 2*LOGO_PAD) / 435.9) = 38.83px
# The strip used to be 33px, which cleared the unpadded 32.46px minimum by a
# quarter of a pixel per side -- so the letterforms ran right up under the v8ui
# object's own 1px border and read as clipped, nothing like the brand artwork's
# generous lime margin. 40 is the next whole pixel that clears the padded
# minimum; the 7px it costs come off GRID_W and SERVER_W below, so every
# right-hand edge and both 12px device margins are exactly where they were.
LOGO_PAD = 4                 # must equal LOGO_PADDING in sndwrksLogo.js
LOGO_X, LOGO_W = M, 40
LOGO_MIN_W = 2 * LOGO_PAD + 89.0 * ((159.0 - 2 * LOGO_PAD) / 435.9)

# grid cells come out at (180 - 18) / 12 = 13.5px wide. that is fine: gridGeometry()
# in sndwrksGrid.js derives cell size from box.rect at draw time, and it is the
# presentation RECTS that have to land on whole pixels, not the cells inside them.
GRID_X, GRID_W = 60, 180     # v8ui note picker; draws its own 12px header row and 18px gutter
SERVER_X, SERVER_W = 60, 114
PORT_X, PORT_W = 178, 62
COL_X = 252
COL_R = W - M                # 688 — every right-hand element ends here

boxes, lines = [], []


def box(oid, maxclass, text=None, rect=(0, 0, 100, 22), ins=1, outs=1,
        pres=None, extra=None, fontsize=None, textcolor=None, font=False):
    b = {"id": oid, "maxclass": maxclass, "numinlets": ins, "numoutlets": outs,
         "patching_rect": [float(v) for v in rect]}
    if outs:
        b["outlettype"] = [""] * outs
    if text is not None:
        b["text"] = text
    if fontsize:
        b["fontsize"] = float(fontsize)
    if font:
        b["fontname"] = FONT
    if textcolor:
        b["textcolor"] = textcolor
    if pres:
        b["presentation"] = 1
        b["presentation_rect"] = [float(v) for v in pres]
    if extra:
        b.update(extra)
    boxes.append({"box": b})


def link(s, so, d, di):
    lines.append({"patchline": {"source": [s, so], "destination": [d, di]}})


def live_param(longname, shortname, enum, invisible):
    """No colour attributes anywhere in here — that is what keeps them dynamic."""
    return {"parameter_enable": 1, "fontname": FONT,
            "saved_attribute_attributes": {"valueof": {
                "parameter_enum": enum,
                "parameter_longname": longname,
                "parameter_shortname": shortname,
                "parameter_mmax": len(enum) - 1,
                "parameter_type": 2,
                "parameter_invisible": invisible}}}


def pattr_param(longname, shortname):
    """pattr as a Live parameter. This is the whole persistence fix.

    parameter_type 3 is Blob — the only parameter type that can carry a symbol.
    The default is 0 (Float), which silently drops a hex payload on save. That is
    why mappings never came back: the pattr had no saved_attribute_attributes at
    all, so it had no declared type.

    parameter_invisible 1 is "Stored Only": saved with the Set, not automatable.
    2 is "Hidden", which is neither, and would reintroduce the same bug from the
    other side. live_param() above already uses exactly this 1-vs-2 split for the
    tabs (whose state must persist) versus the momentary buttons (whose must not).

    parameter_initial_enable 0 stops Max pushing an initial value over the top of
    what Live has just restored. No mmin/mmax/enum — meaningless for a blob.

    parameter_enable goes in saved_object_attributes, NOT at box level and NOT as
    "@parameter_enable 1" in the object text. live_param() above puts it at box
    level because live.* are UI objects; pattr is an object box, so its attributes
    are saved the same way the colls save theirs. Typing it into the text is worse
    than useless: the parameter is then created at instantiation with the default
    type (Float), before saved_attribute_attributes can say otherwise, and Live
    rejects the payload with "<hex>: bad number".
    """
    return {"saved_object_attributes": {"parameter_enable": 1},
            "saved_attribute_attributes": {"valueof": {
                "parameter_longname": longname,
                "parameter_shortname": shortname,
                "parameter_type": 3,
                "parameter_invisible": 1,
                "parameter_initial_enable": 0}}}


# ───────── runtime chain (patching view only, unchanged) ─────────
box("midiin", "newobj", "midiin", (30, 60, 45, 22), 1, 1)
box("midiout", "newobj", "midiout", (760, 60, 52, 22), 1, 0)
box("mparse", "newobj", "midiparse", (30, 100, 300, 22), 1, 8)
box("unpack", "newobj", "unpack 0 0", (30, 140, 78, 22), 1, 2)
box("neq", "newobj", "!= 0", (170, 180, 32, 22), 2, 1)
box("plus", "newobj", "+ 1", (170, 215, 32, 22), 2, 1)
box("gate2", "newobj", "gate 2", (30, 255, 130, 22), 2, 2)
# No @embed. The js is the single source of truth and rebuilds both colls from
# scratch on every init(); embedded contents would be a second, competing copy that
# lives in the device file rather than the Live Set, dirties a frozen .amxd, and
# ships the developer's own mappings as an invisible default.
box("colloff", "newobj", "coll sndwrks_noteoff", (30, 300, 215, 22), 2, 4,
    extra={"saved_object_attributes": {"precision": 6}})
box("collon", "newobj", "coll sndwrks_noteon", (270, 300, 210, 22), 2, 4,
    extra={"saved_object_attributes": {"precision": 6}})
box("rsym", "newobj", "route symbol", (30, 345, 110, 22), 1, 2)
box("fsym", "newobj", "fromsymbol", (30, 385, 90, 22), 1, 1)
box("udp", "newobj", "udpsend 127.0.0.1 52000", (30, 430, 190, 22), 1, 0)
box("dbg", "newobj", "print sndwrks-out", (250, 430, 160, 22), 1, 0)
box("gateT", "newobj", "gate 2", (30, 400, 130, 22), 2, 2)
box("tplus", "newobj", "+ 1", (170, 365, 32, 22), 2, 1)
box("node", "newobj", "node.script sndwrksTcp.js @autostart 1", (250, 470, 250, 22), 1, 2)
box("learngate", "newobj", "gate", (520, 180, 60, 22), 2, 1)
box("prepsel", "newobj", "prepend selectnote", (520, 215, 130, 22), 2, 1)
box("js", "newobj", "js sndwrksMap.js", (30, 560, 200, 22), 1, 9)
box("fson", "newobj", "fromsymbol", (30, 600, 90, 22), 1, 1)
box("fsoff", "newobj", "fromsymbol", (140, 600, 90, 22), 1, 1)
box("pattr", "newobj", "pattr sndwrksMappings", (240, 610, 260, 22), 1, 3,
    extra=dict(pattr_param("sndwrks Mappings", "maps"), varname="sndwrksMappings"))
# [loadbang] fires when the PATCHER finishes loading; [live.thisdevice] fires when the
# DEVICE does, which is after Live has restored parameter values. The second is the one
# that matters here. Keep both: init() is idempotent, and loadbang is what still
# initialises the patch when it is opened in plain Max, where live.thisdevice never bangs.
box("lb", "newobj", "loadbang", (700, 500, 62, 22), 1, 1)
box("thisdev", "newobj", "live.thisdevice", (760, 500, 110, 22), 1, 3)
box("msginit", "message", "init", (700, 560, 40, 22), 2, 1)
# settransport() deliberately does not notifyclients() -- which transport is active
# lives in bTransport's own Live-restored value, not the pattr blob (see NOTES.md).
# But live.tab only OUTPUTS that restored value on load if its "Initial Enable"
# behaviour actually fires, and that is not something to take on faith: if it does
# not, sndwrksMap.js's `transport` stays at its default (0, udp) while the tab is
# visibly showing tcp, and OUT_HOST would then emit the udp port into a [gate 2]
# that is routing to the tcp transport. Banging bTransport here, after
# live.thisdevice/loadbang the same way msginit already does, forces an explicit
# re-emission of whatever value Live actually restored, independent of whether
# Initial Enable fired on its own -- cheap insurance against a real, silent bug.
box("msgbangT", "message", "bang", (700, 590, 44, 22), 2, 1)

for a, ao, b_, bi in [
        ("midiin", 0, "mparse", 0), ("midiin", 0, "midiout", 0),
        ("mparse", 0, "unpack", 0), ("unpack", 1, "neq", 0),
        ("neq", 0, "plus", 0), ("plus", 0, "gate2", 0),
        ("unpack", 0, "gate2", 1), ("gate2", 0, "colloff", 0),
        ("gate2", 1, "collon", 0), ("colloff", 0, "rsym", 0),
        ("collon", 0, "rsym", 0), ("rsym", 0, "fsym", 0),
        ("fsym", 0, "gateT", 1), ("rsym", 1, "gateT", 1),
        ("gateT", 0, "udp", 0), ("gateT", 1, "node", 0),
        ("fsym", 0, "dbg", 0), ("rsym", 1, "dbg", 0),
        ("tplus", 0, "gateT", 0),
        ("unpack", 0, "learngate", 1), ("learngate", 0, "prepsel", 0),
        ("js", 0, "fson", 0), ("fson", 0, "collon", 0),
        ("js", 1, "fsoff", 0), ("fsoff", 0, "colloff", 0),
        ("pattr", 1, "js", 0),
        ("lb", 0, "msginit", 0), ("thisdev", 0, "msginit", 0),
        ("msginit", 0, "js", 0),
        ("lb", 0, "msgbangT", 0), ("thisdev", 0, "msgbangT", 0),
        ("msgbangT", 0, "bTransport", 0),
        ("prepsel", 0, "js", 0)]:
    link(a, ao, b_, bi)

# ───────── left: logo, note grid, server/port ─────────
# a v8ui object is a UI class like live.*, not a generic newobj -- Max saves it with
# maxclass "v8ui" and the script filename on a "filename" key, not as object-box
# text the way [js sndwrksMap.js] is, confirmed against the "v8ui" box Max itself
# writes in C74/help/max/v8ui.maxhelp and C74/snippets/max/"jsui Example.maxsnip".
# decorative, no cords -- see LOGO_W's derivation above for why 33 and not the
# contract's original 30.
box("logo", "v8ui", None, (140, 690, LOGO_W, 159), 1, 1,
    pres=(LOGO_X, 6, LOGO_W, 159),
    extra={"filename": "sndwrksLogo.js", "ignoreclick": 1})

# replaces the bare, unlabelled matrixctrl: sndwrksGrid.js paints its own 12px
# note-name header row and 18px octave gutter, so there is no separate "N O T E S"
# label to draw here any more -- see the object/message contract in NOTES.md.
box("grid", "v8ui", None, (300, 690, GRID_W, 122), 1, 1,
    pres=(GRID_X, 6, GRID_W, 122), extra={"filename": "sndwrksGrid.js"})

box("lblHost", "comment", "S E R V E R", (300, 790, 200, 18), 1, 0,
    pres=(SERVER_X, 132, SERVER_W, 11), fontsize=9, textcolor=DIM, font=True)
box("teHost", "textedit", None, (300, 812, 192, 22), 1, 3,
    pres=(SERVER_X, 145, SERVER_W, 20),
    extra={"bgcolor": FIELD, "textcolor": BRIGHT, "fontsize": 11,
           "fontname": FONT, "rounded": 3, "outputmode": 1})
box("rtHost", "newobj", "route text", (300, 842, 90, 22), 1, 2)
box("prepHost", "newobj", "prepend host", (300, 872, 110, 22), 2, 1)

# PORT: mirrors the SERVER field's textedit -> route text -> prepend -> js chain
# exactly, styled identically, feeding sndwrksMap.js's new port() handler.
box("lblPort", "comment", "P O R T", (300, 790, 120, 18), 1, 0,
    pres=(PORT_X, 132, PORT_W, 11), fontsize=9, textcolor=DIM, font=True)
box("tePort", "textedit", None, (300, 812, 90, 22), 1, 3,
    pres=(PORT_X, 145, PORT_W, 20),
    extra={"bgcolor": FIELD, "textcolor": BRIGHT, "fontsize": 11,
           "fontname": FONT, "rounded": 3, "outputmode": 1})
box("rtPort", "newobj", "route text", (300, 842, 90, 22), 1, 2)
box("prepPort", "newobj", "prepend port", (300, 872, 100, 22), 2, 1)

# ───────── right: editor ─────────
box("lblNote", "comment", "C1  (36)  NOTE ON", (560, 660, 300, 24), 1, 0,
    pres=(COL_X, 8, 244, 22), fontsize=13, textcolor=BRIGHT, font=True)

box("tabMode", "live.tab", None, (560, 690, 128, 22), 1, 3,
    pres=(COL_R - 128, 8, 128, 22),
    extra=live_param("sndwrks Edit Layer", "layer", ["note on", "note off"], 1))
box("prepmode", "newobj", "prepend setmode", (560, 720, 120, 22), 2, 1)

box("lblAddr", "comment", "O S C   A D D R E S S", (560, 760, 200, 18), 1, 0,
    pres=(COL_X, 38, 200, 15), fontsize=9, textcolor=DIM, font=True)
box("teAddr", "textedit", None, (560, 782, 400, 22), 1, 3,
    pres=(COL_X, 54, COL_R - COL_X, 22),
    extra={"bgcolor": FIELD, "textcolor": BRIGHT, "fontsize": 11,
           "fontname": FONT, "rounded": 3, "outputmode": 1})
box("prepaddr", "newobj", "prepend address", (560, 812, 120, 22), 2, 1)

box("lblArgs", "comment", "A R G U M E N T S", (560, 846, 200, 18), 1, 0,
    pres=(COL_X, 82, 200, 15), fontsize=9, textcolor=DIM, font=True)
box("teArgs", "textedit", None, (560, 868, 400, 22), 1, 3,
    pres=(COL_X, 98, COL_R - COL_X, 22),
    extra={"bgcolor": FIELD, "textcolor": BRIGHT, "fontsize": 11,
           "fontname": FONT, "rounded": 3, "outputmode": 1})
box("prepargs", "newobj", "prepend args", (560, 898, 110, 22), 2, 1)

# live.text: Button mode sends a bang, Toggle mode sends 1/0.
box("bSet", "live.text", None, (560, 932, 64, 22), 1, 2, pres=(COL_X, 128, 64, 22),
    extra=dict(live_param("sndwrks Store", "store", ["store", "store"], 2),
               text="store", texton="store", mode=0))
box("tset", "newobj", "t b b b", (560, 962, 70, 22), 1, 3)
box("msgset", "message", "doset", (560, 995, 50, 22), 2, 1)

box("bDel", "live.text", None, (634, 932, 64, 22), 1, 2, pres=(COL_X + 72, 128, 64, 22),
    extra=dict(live_param("sndwrks Delete", "delete", ["delete", "delete"], 2),
               text="delete", texton="delete", mode=0))
box("msgdel", "message", "dodelete", (634, 962, 70, 22), 2, 1)

box("bLearn", "live.text", None, (708, 932, 88, 22), 1, 2,
    pres=(COL_X + 144, 128, 88, 22),
    extra=dict(live_param("sndwrks MIDI Learn", "learn", ["MIDI learn", "LEARNING"], 2),
               text="MIDI learn", texton="LEARNING", mode=1))

box("bTransport", "live.tab", None, (708, 995, 160, 22), 1, 3,
    pres=(COL_R - 160, 128, 160, 22),
    extra=live_param("sndwrks Transport", "transport", ["udp", "tcp"], 1))
box("prepTransport", "newobj", "prepend settransport", (708, 1030, 150, 22), 2, 1)

box("lblHint", "comment", "f:1 float   i:2 int   s:1 string", (560, 1030, 240, 18), 1, 0,
    pres=(COL_X, 152, 240, 14), fontsize=9, textcolor=HINT, font=True)

for a, ao, b_, bi in [
        ("grid", 0, "js", 0), ("js", 2, "grid", 0),
        ("js", 3, "teAddr", 0), ("js", 4, "teArgs", 0), ("js", 5, "lblNote", 0),
        ("teAddr", 0, "prepaddr", 0), ("prepaddr", 0, "js", 0),
        ("teArgs", 0, "prepargs", 0), ("prepargs", 0, "js", 0),
        ("tabMode", 0, "prepmode", 0), ("prepmode", 0, "js", 0),
        ("bSet", 0, "tset", 0),
        ("tset", 2, "teArgs", 0), ("tset", 1, "teAddr", 0), ("tset", 0, "msgset", 0),
        ("msgset", 0, "js", 0),
        ("bDel", 0, "msgdel", 0), ("msgdel", 0, "js", 0),
        ("bLearn", 0, "learngate", 0),
        # bTransport keeps its existing cord to tplus (the runtime gate flip) --
        # prepTransport is a SECOND destination from the same outlet, not a
        # replacement, mirroring how tabMode reaches the js through prepmode.
        ("bTransport", 0, "tplus", 0),
        ("bTransport", 0, "prepTransport", 0), ("prepTransport", 0, "js", 0),
        ("teHost", 0, "rtHost", 0), ("rtHost", 0, "prepHost", 0),
        # The SERVER field reaches the transports ONLY through the js, which is what
        # makes the host it persists the same host it uses, and gives a typo like
        # "1.2.3.4:52001" a single place to be caught. The js emits a fully-formed
        # "host <ip>" on outlet 6 rather than routing back through [prepend host],
        # so this stays a line, not a cycle. PORT mirrors this exactly.
        ("prepHost", 0, "js", 0),
        ("tePort", 0, "rtPort", 0), ("rtPort", 0, "prepPort", 0),
        ("prepPort", 0, "js", 0),
        ("js", 6, "udp", 0), ("js", 6, "node", 0),
        ("js", 7, "teHost", 0), ("js", 8, "tePort", 0)]:
    link(a, ao, b_, bi)

# ───────── device-level keys Live's own save adds beyond a plain .maxpat ─────────
#
# Sample every parameter-enabled box, not just the live.* ones, and derive the
# "parameters" block from it -- the exact values are already computed by
# live_param()/pattr_param() above, and hand-maintaining a second copy of the
# parameter names here is precisely how the pattr shipped for a year with no
# parameter_type: it was never in the sample, so nothing ever checked it.
params = [b["box"] for b in boxes
          if b["box"].get("parameter_enable")
          or b["box"].get("saved_object_attributes", {}).get("parameter_enable")]

parameters_block = {}
for _b in params:
    _v = _b["saved_attribute_attributes"]["valueof"]
    parameters_block[_b["id"]] = [_v["parameter_longname"], _v["parameter_shortname"], 0]
# these two keys are fixed device-level bookkeeping, not per-box, and are present
# on the real device with these exact values regardless of parameter count.
parameters_block["parameterbanks"] = {"0": {"index": 0, "name": "",
    "parameters": ["-"] * 8, "buttons": ["-"] * 8}}
parameters_block["inherited_shortname"] = 1

# mac/hfs epoch (1904-01-01) is 2082844800s before the unix epoch; Live's project
# block stores its two timestamps in that epoch.
MAC_EPOCH_OFFSET = 2082844800
_now_mac = int(time.time()) + MAC_EPOCH_OFFSET

patch = {"patcher": {
    "fileversion": 1,
    "appversion": {"major": 9, "minor": 1, "revision": 0,
                   "architecture": "x64", "modernui": 1},
    "classnamespace": "box",
    "rect": [60.0, 100.0, 1100.0, 800.0],
    "openrect": [0.0, 0.0, float(W), float(H)],
    "openrectmode": 0,
    "openinpresentation": 1,
    "default_fontsize": 10.0,
    "default_fontname": "Arial Bold",
    "gridsize": [8.0, 8.0],
    "boxanimatetime": 500,
    "devicewidth": float(W),
    "parameters": parameters_block,
    "latency": 0,
    "is_mpe": 0,
    "external_mpe_tuning_enabled": 0,
    "minimum_live_version": "",
    "minimum_max_version": "",
    "platform_compatibility": 0,
    "project": {
        "version": 1, "creationdate": _now_mac, "modificationdate": _now_mac,
        "viewrect": [0.0, 0.0, 300.0, 500.0], "autoorganize": 1,
        "hideprojectwindow": 1, "showdependencies": 1, "autolocalize": 0,
        "contents": {"patchers": {}}, "layout": {}, "searchpath": {},
        "detailsvisible": 0, "amxdtype": 1835887981, "readonly": 0,
        "devpathtype": 0, "devpath": ".", "sortmode": 0, "viewmode": 0,
        "includepackages": 0},
    "autosave": 0,
    "saved_attribute_attributes": {"default_plcolor": {"expression": ""}},
    "oscreceiveudpport": 0,
    "boxes": boxes, "lines": lines}}

with open("sndwrks-osc.maxpat", "w") as f:
    json.dump(patch, f, indent=1)


# ───────── .amxd container ─────────
#
# see "The .amxd container" in NOTES.md, decoded from the real
# installed device: "ampf" magic / chunk-size=4 / "mmmm" (MIDI effect) / "meta"
# chunk (size=4, value=1) / "ptch" chunk holding len(json)+1 (the +1 is the
# trailing NUL) followed by the NUL-terminated patcher JSON itself. Not frozen --
# there is no mx@c chunk -- so the .js files still need to be on Max's search
# path to run, same as the .maxpat.
def amxd_bytes (patcher):
    payload = json.dumps(patcher).encode("utf-8") + b"\x00"
    header = (b"ampf" + struct.pack("<I", 4)
              + b"mmmm" + b"meta" + struct.pack("<I", 4) + struct.pack("<I", 1)
              + b"ptch" + struct.pack("<I", len(payload)))
    return header, payload


amxd_header, amxd_payload = amxd_bytes(patch)
with open("sndwrks-osc.amxd", "wb") as f:
    f.write(amxd_header)
    f.write(amxd_payload)

# ───────── checks ─────────
outs = {b["box"]["id"]: b["box"]["numoutlets"] for b in boxes}
ins = {b["box"]["id"]: b["box"]["numinlets"] for b in boxes}
bad = [f"{s}:{so}" for l in lines
       for (s, so), (d, di) in [(l["patchline"]["source"], l["patchline"]["destination"])]
       if s not in outs or so >= outs[s] or d not in ins or di >= ins[d]]

pres = [b["box"] for b in boxes if b["box"].get("presentation")]
rects = [b["presentation_rect"] for b in pres]
frac = [b["id"] for b in pres if any(v != int(v) for v in b["presentation_rect"])]
left = min(r[0] for r in rects)
right = max(r[0] + r[2] for r in rects)
bottom = max(r[1] + r[3] for r in rects)
panels = [b["box"]["id"] for b in boxes if b["box"]["maxclass"] == "panel"]
lives = [b["box"] for b in boxes if b["box"]["maxclass"].startswith("live.")]
# This only samples maxclass.startswith("live."), so the v8ui logo's two hardcoded
# LOGO_FILL_BG/LOGO_FILL_INK colours (sndwrksLogo.js) never trip it -- deliberately.
# live.* objects must stay themeable; a v8ui object is not a live.* control and the
# brand strip is meant to read the same regardless of the user's Live theme. See the
# comment at sndwrksLogo.js's colour constants for the fuller reasoning.
colored = [b["id"] for b in lives
           if any(k for k in b if "color" in k.lower())]

noattrs = [b["id"] for b in params if "saved_attribute_attributes" not in b]
pvals = [b["saved_attribute_attributes"]["valueof"] for b in params
         if "saved_attribute_attributes" in b]
names = [v["parameter_longname"] for v in pvals]
longshort = [v["parameter_shortname"] for v in pvals
             if len(v["parameter_shortname"]) > 15]

pattrs = [b for b in params
          if b["maxclass"] == "newobj" and b.get("text", "").startswith("pattr")]
notblob = [b["id"] for b in pattrs
           if b["saved_attribute_attributes"]["valueof"].get("parameter_type") != 3]
nostore = [b["id"] for b in pattrs
           if b["saved_attribute_attributes"]["valueof"].get("parameter_invisible") != 1]
noname = [b["id"] for b in pattrs if not b.get("varname")]
# "@parameter_enable 1" typed into an object box registers the parameter at
# instantiation with the default type, before parameter_type can be applied
intext = [b["id"] for b in params if "@parameter_enable" in (b.get("text") or "")]
misplaced = [b["id"] for b in params
             if b["maxclass"] == "newobj" and b.get("parameter_enable")]
initon = [b["id"] for b in params
          if b.get("saved_attribute_attributes", {}).get("valueof", {})
               .get("parameter_type") == 3
          and b["saved_attribute_attributes"]["valueof"].get("parameter_initial_enable")]

embedded = [b["box"]["id"] for b in boxes
            if "@embed" in (b["box"].get("text") or "")
            or b["box"].get("saved_object_attributes", {}).get("embed")]
jsouts = max([so for l in lines
              for (src, so) in [l["patchline"]["source"]] if src == "js"] or [-1]) + 1

print("boxes %d  lines %d  wiring: %s" % (len(boxes), len(lines), bad or "ok"))
print("live.* objects: %d   with hardcoded colours: %s" % (len(lives), colored or "none"))
print("parameter objects: %d   missing saved_attribute_attributes: %s"
      % (len(params), noattrs or "none"))
print("unique parameter names: %s   shortnames over 15 chars: %s"
      % (len(names) == len(set(names)), longshort or "none"))
print("pattr params: %d   not Blob (type 3): %s   not Stored Only: %s   no varname: %s"
      % (len(pattrs), notblob or "none", nostore or "none", noname or "none"))
print("blob params with parameter_initial_enable on: %s" % (initon or "none"))
print("parameter_enable typed into object text: %s   at box level on a newobj: %s"
      % (intext or "none", misplaced or "none"))
print("objects with embed: %s" % (embedded or "none"))
print("js outlets declared %d   highest used %d   ok: %s"
      % (outs["js"], jsouts - 1, outs["js"] >= jsouts))
print("fractional pixel rects: %s" % (frac or "none"))
print("left margin %d   right margin %d   symmetric: %s"
      % (left, W - right, left == W - right))
print("tallest %dpx (limit %d)   panels: %s" % (bottom, H, panels or "none"))

# device width can never again silently disagree with the layout it was laid out
# against -- the two silently disagreed once, and nothing complained.
print("devicewidth %s == W %d: %s" % (patch["patcher"]["devicewidth"], W,
      patch["patcher"]["devicewidth"] == W))

# every parameter-enabled box must be declared in "parameters" (or Live never shows
# it in View -> Parameters, no matter how correct saved_attribute_attributes is),
# and nothing else should be -- parameterbanks/inherited_shortname are the only
# fixed, non-box exceptions.
_param_ids = {b["id"] for b in params}
_declared_param_keys = set(parameters_block) - {"parameterbanks", "inherited_shortname"}
print("parameter-enabled boxes not in parameters block: %s   extra entries: %s"
      % (sorted(_param_ids - _declared_param_keys) or "none",
         sorted(_declared_param_keys - _param_ids) or "none"))

# the logo strip needs to clear LOGO_MIN_W (see its derivation above the constant)
# or drawWordmark() in sndwrksLogo.js becomes width-limited and letterboxes the
# mark down further than the strip's own height would otherwise allow. LOGO_MIN_W
# is derived from LOGO_PAD, so the padding the script actually draws with is read
# back out of it here rather than trusted to stay in step by hand.
with open("sndwrksLogo.js") as f:
    _logo_src = f.read()
_m = re.search(r"^const LOGO_PADDING = (\d+(?:\.\d+)?);", _logo_src, re.M)
_js_pad = float(_m.group(1)) if _m else None
print("logo strip %dpx wide   clears padded minimum %.2fpx: %s   LOGO_PAD %s == sndwrksLogo.js LOGO_PADDING %s: %s"
      % (LOGO_W, LOGO_MIN_W, LOGO_W >= LOGO_MIN_W,
         LOGO_PAD, _js_pad, _js_pad == float(LOGO_PAD)))

# v8ui reports mouse position and redraws correctly ONLY while an object's patching
# and presentation sizes agree -- stated outright in v8ui.maxref.xml's discussion.
# Both v8ui boxes here are laid out from one width constant each, so this can only
# break by hand; it is cheap enough to keep honest.
_v8_mismatch = [b["box"]["id"] for b in boxes
                if b["box"]["maxclass"] == "v8ui" and b["box"].get("presentation")
                and b["box"]["patching_rect"][2:] != b["box"]["presentation_rect"][2:]]
print("v8ui patching size == presentation size: %s" % (_v8_mismatch or "all match"))

# round-trip the .amxd just written: strip the 32-byte header, confirm the
# declared ptch length matches the actual payload byte-for-byte, and confirm the
# payload parses back to the same patcher JSON -- the cheapest possible check
# standing between this script and shipping a corrupt device file.
with open("sndwrks-osc.amxd", "rb") as f:
    _written = f.read()
_declared_len = struct.unpack("<I", _written[28:32])[0]
_actual_payload = _written[32:]
_len_ok = _declared_len == len(_actual_payload)
try:
    _roundtripped = json.loads(_actual_payload[:-1])  # drop the trailing NUL
    _json_ok = _roundtripped == patch
except Exception:
    _json_ok = False
print("amxd round-trip: declared len %d == actual %d: %s   json.loads matches: %s"
      % (_declared_len, len(_actual_payload), _len_ok, _json_ok))
