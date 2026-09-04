#!/usr/bin/env python3
"""
SVG letterforms to mgraphics ops — 2026-09-03T00:00:00Z

Converts the sndwrks wordmark's letterform <path> elements into
mgraphics.move_to / line_to / curve_to / close_path call data, and writes
the result into sndwrksLogo.js as committed, regenerable output.

Why this exists: sndwrksLogo.js runs on v8ui with no filesystem access once
the Max for Live device is frozen, so the wordmark has to be baked into the
.js as data at build time. Hand-transcribing the bezier coordinates out of
the SVG would be unmaintainable and impossible to verify by eye, so instead
this script parses the real path data and regenerates that block whenever
the source artwork changes.

Two known traps in the source SVG, both irrelevant to this script but worth
repeating because they bit earlier investigation:
  - the fills live in a <defs><style> CSS block keyed by UUID class names,
    not as presentation attributes — this script does not care, because it
    only extracts geometry, and colour is chosen and hardcoded separately in
    sndwrksLogo.js (see the comment there).
  - not every file named "sndwrks-logo.svg" is one: some copies in circulation
    are a base64 PNG in a vector wrapper, with no real path data at all. This
    script asserts rather than guessing, so it will tell you if you hand it one.

Usage:
  python3 tools/svgToMgraphics.py

Regenerates the block between the "BEGIN GENERATED" / "END GENERATED"
markers in sndwrksLogo.js in place. Everything outside those markers
(colour choice, the paint() function, the rotate/scale math) is
hand-authored and left untouched.
"""
import json
import os
import re
import sys

USAGE = "usage: python3 tools/svgToMgraphics.py [path/to/sndwrks-logo.svg]"
TOOLS_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_PATH = os.path.join(os.path.dirname(TOOLS_DIR), "sndwrksLogo.js")
# the wordmark artwork ships in-tree so the generated block can be reproduced
# from a clone. Pass a path to point this at a newer cut of the logo instead.
DEFAULT_SVG_PATH = os.path.join(TOOLS_DIR, "sndwrks-logo.svg")
BEGIN_MARKER = "// BEGIN GENERATED: tools/svgToMgraphics.py — do not hand-edit between these markers"
END_MARKER = "// END GENERATED"

# svg path grammar: a command letter, or a number (optionally signed,
# optionally fractional, no exponents appear in this file but they are
# legal svg so the pattern still accepts them).
TOKEN_RE = re.compile(r"[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:[eE][-+]?\d+)?")

# fixed argument count per absolute command letter. Q/T/A are intentionally
# absent — see the assertion in tokenize_path() below.
ARITY = {"M": 2, "L": 2, "H": 1, "V": 1, "C": 6, "S": 4, "Z": 0}
SUPPORTED_LETTERS = set("MmLlHhVvCcSsZz")


def extract_letterform_paths(svg_text):
  """pull the d= attribute out of every <path> element, in document order.

  deliberately does not match <rect>, so the background swatch is skipped
  without needing any colour-based filtering.
  """
  paths = re.findall(r"<path\b[^>]*\sd=\"([^\"]+)\"", svg_text)
  assert len(paths) == 7, (
    "expected 7 letterform <path> elements (s n d w r k s), found %d — "
    "the source svg changed shape, go look at it before trusting this "
    "output" % len(paths)
  )
  return paths


def tokenize_path(d):
  """turn a path's d attribute into a flat list of command/number tokens,
  and assert that the tokenizer accounted for every non-separator
  character. a gap here means a command this script doesn't know about
  slipped through silently, which is exactly the failure mode we refuse to
  allow.
  """
  tokens = []
  cursor = 0
  for match in TOKEN_RE.finditer(d):
    gap = d[cursor:match.start()]
    assert gap.strip(" \t\n\r,") == "", (
      "unparseable characters %r in path data before position %d: %r"
      % (gap, match.start(), d)
    )
    tokens.append(match.group(0))
    cursor = match.end()
  trailing = d[cursor:]
  assert trailing.strip(" \t\n\r,") == "", (
    "unparseable trailing characters %r in path data: %r" % (trailing, d)
  )
  return tokens


def parse_path(d, path_index):
  """convert one path's d attribute into a list of subpaths, each a list of
  absolute-coordinate ops: ('M', x, y) / ('L', x, y) /
  ('C', x1, y1, x2, y2, x, y) / ('Z',).

  handles relative commands, h/v shorthands, s smooth-curve shorthand, and
  the implicit-repeat rule (a command letter followed by more numbers than
  its arity, with no new letter, repeats the command — and a repeated M
  becomes an L, per the svg spec).
  """
  tokens = tokenize_path(d)
  assert tokens and tokens[0] in ("M", "m"), (
    "path %d must start with a moveto, got %r" % (path_index, tokens[:1])
  )

  subpaths = []
  current_ops = None
  cx = cy = 0.0
  sx = sy = 0.0
  prev_base = None
  prev_ctrl = None  # reflected control point, for s/S

  def emit(op):
    current_ops.append(op)

  i = 0
  n = len(tokens)
  while i < n:
    letter = tokens[i]
    assert letter in SUPPORTED_LETTERS, (
      "path %d uses command %r, which this converter does not implement. "
      "refusing to silently drop it — a dropped segment shows up as a "
      "subtly malformed letter. add support for it instead of skipping."
      % (path_index, letter)
    )
    base = letter.upper()
    relative = letter.islower()
    i += 1
    arity = ARITY[base]
    first_rep = True

    while True:
      if base == "Z":
        emit(("Z",))
        cx, cy = sx, sy
        prev_base = "Z"
        prev_ctrl = None
        break

      if i >= n or tokens[i] in SUPPORTED_LETTERS:
        break  # no (more) implicit repeats of this command

      args_tok = tokens[i:i + arity]
      assert len(args_tok) == arity, (
        "path %d: command %r truncated, expected %d more numbers, got %r"
        % (path_index, letter, arity, args_tok)
      )
      args = [float(t) for t in args_tok]
      i += arity

      effective_base = base
      if base == "M" and not first_rep:
        effective_base = "L"  # implicit repeats of moveto are linetos

      if effective_base == "M":
        x, y = args
        if relative:
          x += cx
          y += cy
        cx, cy = x, y
        sx, sy = x, y
        current_ops = []
        subpaths.append(current_ops)
        emit(("M", x, y))
        prev_ctrl = None
        prev_base = "M"
      elif effective_base == "L":
        x, y = args
        if relative:
          x += cx
          y += cy
        cx, cy = x, y
        emit(("L", x, y))
        prev_ctrl = None
        prev_base = "L"
      elif effective_base == "H":
        x, = args
        if relative:
          x += cx
        cx = x
        emit(("L", cx, cy))
        prev_ctrl = None
        prev_base = "H"
      elif effective_base == "V":
        y, = args
        if relative:
          y += cy
        cy = y
        emit(("L", cx, cy))
        prev_ctrl = None
        prev_base = "V"
      elif effective_base == "C":
        x1, y1, x2, y2, x, y = args
        if relative:
          x1 += cx
          y1 += cy
          x2 += cx
          y2 += cy
          x += cx
          y += cy
        emit(("C", x1, y1, x2, y2, x, y))
        prev_ctrl = (x2, y2)
        cx, cy = x, y
        prev_base = "C"
      elif effective_base == "S":
        x2, y2, x, y = args
        if relative:
          x2 += cx
          y2 += cy
          x += cx
          y += cy
        if prev_base in ("C", "S") and prev_ctrl is not None:
          x1 = 2 * cx - prev_ctrl[0]
          y1 = 2 * cy - prev_ctrl[1]
        else:
          x1, y1 = cx, cy
        emit(("C", x1, y1, x2, y2, x, y))
        prev_ctrl = (x2, y2)
        cx, cy = x, y
        prev_base = "S"

      first_rep = False

  return subpaths


def compute_bbox(letterforms):
  """bounding box over every anchor point AND every bezier control point.

  a cubic bezier always lies within the convex hull of its own anchor and
  control points, so including the control points in this min/max makes
  the box a safe (very slightly conservative) over-approximation of the
  true letterform extent rather than an under-approximation that could
  clip a curve that bulges past its endpoints.
  """
  min_x = min_y = float("inf")
  max_x = max_y = float("-inf")
  for subpaths in letterforms:
    for ops in subpaths:
      for op in ops:
        if op[0] == "Z":
          continue
        coords = op[1:]
        xs = coords[0::2]
        ys = coords[1::2]
        min_x = min(min_x, *xs)
        max_x = max(max_x, *xs)
        min_y = min(min_y, *ys)
        max_y = max(max_y, *ys)
  return {"minX": min_x, "minY": min_y, "maxX": max_x, "maxY": max_y}


def format_number(value):
  """trim floating point noise without losing precision svg actually needs."""
  rounded = round(value, 3)
  if rounded == int(rounded):
    return str(int(rounded))
  return ("%.3f" % rounded).rstrip("0").rstrip(".")


def render_op_js(op, indent):
  # one op per line, single-quoted, comma-spaced — keeps every line well
  # under this repo's eslint max-len (100) and lints clean on quotes and
  # comma-spacing without a --fix pass.
  if op[0] == "Z":
    return "%s['Z']," % indent
  nums = ", ".join(format_number(v) for v in op[1:])
  return "%s['%s', %s]," % (indent, op[0], nums)


def render_letterforms_js(letterforms):
  letter_blocks = []
  for subpaths in letterforms:
    subpath_blocks = []
    for ops in subpaths:
      op_lines = "\n".join(render_op_js(op, "      ") for op in ops)
      subpath_blocks.append("    [\n%s\n    ]," % op_lines)
    letter_blocks.append("  [\n%s\n  ]," % "\n".join(subpath_blocks))
  return "[\n%s\n]" % "\n".join(letter_blocks)


def render_bbox_js(bbox):
  return (
    "{\n"
    "  minX: %s,\n"
    "  minY: %s,\n"
    "  maxX: %s,\n"
    "  maxY: %s,\n"
    "}"
  ) % (
    format_number(bbox["minX"]),
    format_number(bbox["minY"]),
    format_number(bbox["maxX"]),
    format_number(bbox["maxY"]),
  )


def build_generated_block(letterforms, bbox):
  lines = []
  lines.append(BEGIN_MARKER)
  lines.append("// letterform outlines traced from the sndwrks wordmark SVG")
  lines.append("// regenerate with: python3 tools/svgToMgraphics.py")
  lines.append(
    "// each letter is a list of subpaths (a second subpath is the"
  )
  lines.append(
    "// counter/hole in \"d\"); each subpath is a list of ops,"
  )
  lines.append(
    "// ['M', x, y] / ['L', x, y] / ['C', x1, y1, x2, y2, x, y] / ['Z'],"
  )
  lines.append(
    "// in original svg-artboard coordinates (not yet scaled or rotated)."
  )
  lines.append("const LOGO_LETTERFORMS = %s;" % render_letterforms_js(letterforms))
  lines.append("")
  lines.append(
    "// letterform bounding box (anchor points and bezier control points),"
  )
  lines.append(
    "// computed from the parsed paths above, not hardcoded — see"
  )
  lines.append(
    "// compute_bbox() in tools/svgToMgraphics.py."
  )
  lines.append("const LOGO_BBOX = %s;" % render_bbox_js(bbox))
  lines.append(END_MARKER)
  return "\n".join(lines)


DEFAULT_FILE_TEMPLATE = """/**
 * sndwrks wordmark, rotated up the left edge — 2026-09-03T00:00:00Z
 */

// colour treatment: #333
// letterforms on the lime #c2f280 strip, reproducing the source artwork's
// own background rect + letterform fill exactly as designed. chosen over
// "lime letterforms directly on the device background" because the strip
// carries its own guaranteed-contrast background and reads correctly
// whether the user's live theme is light or dark; lime sits at a similar
// luminance to a light theme's panel colour, so letterforms without their
// own backing would lose legibility there.
// these are the only hardcoded colours anywhere in this device.
// build-patch.py's colour check only samples maxclass.startswith('live.'),
// so a v8ui object never trips it — but the exemption here is deliberate,
// not an oversight, hence this comment.
const LOGO_FILL_BG = [0.7608, 0.949, 0.502, 1.0]; // #c2f280
const LOGO_FILL_INK = [0.2, 0.2, 0.2, 1.0]; // #333

__GENERATED__

mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;

// rotates the wordmark 90 degrees so it reads bottom-to-top up the strip:
// the letterform's left-to-right reading axis (svg x) maps onto the box's
// bottom-to-top axis, and the letterform's cap-to-baseline axis (svg y)
// maps onto the box's left-to-right axis, with letter tops facing the
// strip's left edge — the usual convention for sideways vertical text
// (imagine tilting your head left to read it).
//
// uses the LETTERFORM bounding box (LOGO_BBOX), not the full 512 x 162.9
// canvas: the canvas is a 3.28:1 rectangle, and fitting that aspect into a
// narrow rotated strip letterboxes the mark down to roughly a third of the
// available height. the letterform bbox is close to the strip's own aspect
// once rotated, so it fills the strip instead.
//
// scaled uniformly (not stretched independently per axis) so the
// letterforms keep their original proportions rather than being squashed
// to exactly fill a strip whose aspect ratio does not perfectly match the
// letterform bbox's.
function drawWordmark (boxWidth, boxHeight) {
  const bboxWidth = LOGO_BBOX.maxX - LOGO_BBOX.minX;
  const bboxHeight = LOGO_BBOX.maxY - LOGO_BBOX.minY;
  const scale = Math.min(boxHeight / bboxWidth, boxWidth / bboxHeight);
  const offsetX = (boxWidth - bboxHeight * scale) / 2;
  const offsetY = (boxHeight - bboxWidth * scale) / 2;

  // op is ['M', svgX, svgY] (etc.) — toScreenX takes the svg Y (the cross
  // axis) and toScreenY takes the svg X (the reading axis), per the
  // rotation this function's header comment describes.
  const toScreenX = (svgY) => offsetX + (svgY - LOGO_BBOX.minY) * scale;
  const toScreenY = (svgX) => offsetY + (bboxWidth - (svgX - LOGO_BBOX.minX)) * scale;

  mgraphics.set_source_rgba(LOGO_FILL_INK);
  LOGO_LETTERFORMS.forEach((subpaths) => {
    subpaths.forEach((ops) => {
      ops.forEach((op) => {
        const type = op[0];
        if (type === 'M') {
          mgraphics.move_to(toScreenX(op[2]), toScreenY(op[1]));
        } else if (type === 'L') {
          mgraphics.line_to(toScreenX(op[2]), toScreenY(op[1]));
        } else if (type === 'C') {
          // control points get the same transform as anchor points — it
          // is still an affine map (uniform scale + translate), so the
          // curve's shape is preserved.
          const x1 = toScreenX(op[2]);
          const y1 = toScreenY(op[1]);
          const x2 = toScreenX(op[4]);
          const y2 = toScreenY(op[3]);
          const x3 = toScreenX(op[6]);
          const y3 = toScreenY(op[5]);
          mgraphics.curve_to(x1, y1, x2, y2, x3, y3);
        } else if (type === 'Z') {
          mgraphics.close_path();
        } else {
          // should be unreachable — tools/svgToMgraphics.py only ever
          // emits M / L / C / Z — but fail loudly rather than silently
          // drawing nothing if that ever stops being true.
          throw new Error(`sndwrksLogo: unhandled op ${type}`);
        }
      });
      // each letter's subpaths (the outer contour, plus a counter/hole
      // subpath for "d") share one fill via mgraphics' default nonzero
      // winding rule — the same rule svg uses by default — so the hole
      // renders correctly as long as subpath winding order is preserved,
      // which it is: this converter never reverses a subpath.
    });
  });
  mgraphics.fill();
}

function paint () {
  // box.rect is [x0, y0, x1, y1] in the device's own coordinate space, and
  // slice 02 may still adjust the strip width — so the scale below is
  // always derived from the box's actual size at draw time, never from a
  // hardcoded 30 x 159.
  const boxWidth = box.rect[2] - box.rect[0];
  const boxHeight = box.rect[3] - box.rect[1];

  mgraphics.set_source_rgba(LOGO_FILL_BG);
  mgraphics.rectangle(0, 0, boxWidth, boxHeight);
  mgraphics.fill();

  drawWordmark(boxWidth, boxHeight);
}
"""


def main():
  # Defaults to the copy committed beside this script, so `python3
  # tools/svgToMgraphics.py` reproduces the generated block from a clone.
  if len(sys.argv) > 2:
    raise SystemExit(USAGE)

  svg_path = sys.argv[1] if len(sys.argv) == 2 else DEFAULT_SVG_PATH
  if not os.path.isfile(svg_path):
    raise SystemExit("no such file: %s\n%s" % (svg_path, USAGE))

  with open(svg_path, "r", encoding="utf-8") as handle:
    svg_text = handle.read()

  raw_paths = extract_letterform_paths(svg_text)
  letterforms = [parse_path(d, index) for index, d in enumerate(raw_paths)]
  bbox = compute_bbox(letterforms)
  generated_block = build_generated_block(letterforms, bbox)

  if os.path.exists(OUTPUT_PATH):
    with open(OUTPUT_PATH, "r", encoding="utf-8") as handle:
      existing = handle.read()
    assert BEGIN_MARKER in existing and END_MARKER in existing, (
      "%s exists but is missing the generated-block markers — "
      "regenerate it from scratch or restore the markers by hand first"
      % OUTPUT_PATH
    )
    before, rest = existing.split(BEGIN_MARKER, 1)
    _, after = rest.split(END_MARKER, 1)
    new_content = before + generated_block + after
  else:
    new_content = DEFAULT_FILE_TEMPLATE.replace("__GENERATED__", generated_block)

  with open(OUTPUT_PATH, "w", encoding="utf-8") as handle:
    handle.write(new_content)

  commands_used = sorted({op[0] for subpaths in letterforms for ops in subpaths for op in ops})
  print("wrote %s" % OUTPUT_PATH)
  print("letters: %d, subpaths: %d, ops: %d" % (
    len(letterforms),
    sum(len(s) for s in letterforms),
    sum(len(ops) for s in letterforms for ops in s),
  ))
  print("mgraphics op types used: %s" % ", ".join(commands_used))
  print("letterform bbox: %s" % json.dumps(bbox))


if __name__ == "__main__":
  main()
