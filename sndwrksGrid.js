/**
 * A matrixctrl grows note names — 2026-09-03T21:10:26Z
 *
 * sndwrksGrid.js — the note picker for the sndwrks M4L device. Replaces a bare,
 * unlabelled 16x8 matrixctrl with a 12x11 table that reads like a piano roll:
 * pitch classes across the top, octaves down the right, so cell (0, 3) is
 * legible as "C1" instead of a coordinate you have to already know by heart.
 *
 * This runs on v8ui, Max 9's V8-backed engine -- not [js], which is ES5-only.
 * v8.mxo registers both the v8 and v8ui classes; there is no separate
 * v8ui.mxo, confirmed against the Max 9.1.4 bundled with this machine's Live
 * 12 Suite install. ES6+ syntax (const, let, arrow functions, destructuring)
 * is correct here for that reason.
 *
 * Message contract (see NOTES.md):
 *   outlet 0    -> sndwrksMap.js inlet : selectnote <n>            (0-127, live cells only)
 *   inlet       <- sndwrksMap.js       : selected <n>              (move the selection ring)
 *   inlet       <- sndwrksMap.js       : clearmapped               (forget every mapped note)
 *   inlet       <- sndwrksMap.js       : mapnote <n>               (one mapped note, repeated)
 *
 * clearmapped + one mapnote per note replaces the single 'mapped <n> <n> ...' message the
 * contract originally specified. That message was sent as a JS Array argument -- the only
 * such outlet() call in the device -- and the shipped grid painted no mapped cells and no
 * selection ring either, which puts the failure in sndwrksMap.js's refreshGrid() rather
 * than here. Every message now carries a selector and at most one scalar argument, the
 * shape the rest of this patch already relies on; see refreshGrid() for the full account.
 * It is still wholesale, not a diff: clearmapped starts every repaint from nothing.
 *
 * The grid owns its own drawing and hit-testing, so there is no diff machinery
 * here to go wrong the way matrixctrl's set/clear echo did in sndwrksMap.js --
 * a clearmapped/mapnote burst is the whole truth and is painted from scratch.
 */

mgraphics.init();
// we stroke the selection ring without wanting an implicit fill after it
mgraphics.autofill = 0;
// top-left origin, in pixels -- matches box-local click coordinates directly
mgraphics.relative_coords = 0;

inlets = 1;
outlets = 1;

setinletassist(0, 'selected <n> / clearmapped / mapnote <n>, from sndwrksMap.js');
setoutletassist(0, 'selectnote <n>, to sndwrksMap.js');

const COLUMNS = 12;
const ROWS = 11;
const HEADER_HEIGHT = 12; // note-name row across the top
const GUTTER_WIDTH = 18; // octave-number column down the right
const LOWEST_OCTAVE = -2; // row 0 is octave -2 -- see noteName() at sndwrksMap.js:70

const PITCH_CLASS_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// column indices of the black keys, for the piano-roll shading
const BLACK_KEY_COLUMNS = {
  1: true, 3: true, 6: true, 8: true, 10: true,
};

// the one deliberate hardcoded colour in this object: sndwrks brand lime, #c2f280,
// used for the mapped-cell fill so a mapping reads the same regardless of Live's
// theme. Everything else below is read dynamically through max.getcolor().
const MAPPED_FILL = [0.7607843137254902, 0.9490196078431372, 0.5019607843137255, 1.0];

// fallbacks for when max.getcolor() can't resolve a theme token -- e.g. this
// object is opened outside a real Live Set with a loaded colour theme. FALLBACK_DIM
// matches DIM in build-patch.py ([0.62, 0.62, 0.64, 1.0]), the fixed grey already
// used for label text elsewhere in this patch, so an unthemed grid still looks
// like it belongs next to the rest of the device.
const FALLBACK_DIM = [0.62, 0.62, 0.64, 1.0];
const FALLBACK_BODY = [0.16, 0.16, 0.17, 1.0];
const FALLBACK_SELECTION = [0.45, 0.72, 1.0, 1.0];

// set to 0 once everything works, exactly as in sndwrksMap.js; while it is 1 every
// inbound message is logged to the Max window. this is how a message that never
// arrives is told apart from one that arrives and paints nothing.
const DEBUG = 0;

let mappedNotes = {};
let selectedNote = null;
let hoverNote = null;

// max.getcolor() is not part of v8ui's published TS surface (it is missing from
// the "declare class Max" block in Max's own ced_editor type definitions), but it
// is exactly how Ableton's own shipped jsui templates (jsui_live_barslider.js,
// interfaces/theme_constructor.js) read Live theme colours, and it is documented
// in the "Dynamic Colors" user guide page as the correct v8/v8ui/v8.codebox API.
// Wrapped defensively anyway, since that gap in the type defs means it cannot be
// taken on faith without a running Live Set to test against.
function themeColor (tokenName, fallback) {
  try {
    const color = max.getcolor(tokenName);
    if (color && color.length === 4) return color;
  } catch (error) {
    // fall through to the fixed colour below
  }
  return fallback;
}

function noteAt (column, row) {
  return row * COLUMNS + column;
}

// 11 rows x 12 columns = 132 cells, but MIDI stops at 127. the dead cells are
// notes 128-131, all in row 10 (octave 8), columns 8-11.
function isDeadNote (note) {
  return note > 127;
}

function octaveOf (row) {
  return row + LOWEST_OCTAVE;
}

// derive geometry from the box's actual size every time rather than hardcoding
// 186x122, so a later layout pass (slice 02) can resize this box without a
// second edit here. header height and gutter width stay fixed pixel amounts --
// they hold text, not proportional content -- everything else scales.
function gridGeometry () {
  const width = box.rect[2] - box.rect[0];
  const height = box.rect[3] - box.rect[1];
  return {
    width,
    height,
    cellWidth: (width - GUTTER_WIDTH) / COLUMNS,
    cellHeight: (height - HEADER_HEIGHT) / ROWS,
  };
}

function cellRect (column, row, geometry) {
  return {
    x: column * geometry.cellWidth,
    y: HEADER_HEIGHT + row * geometry.cellHeight,
    w: geometry.cellWidth,
    h: geometry.cellHeight,
  };
}

function shade (color, factor) {
  return [color[0] * factor, color[1] * factor, color[2] * factor, color[3]];
}

// null outside the grid body (header row, gutter column, or the object's border);
// otherwise the column/row/note under (x, y). does not distinguish dead cells --
// callers that care (onclick) check isDeadNote() themselves.
function hitTest (x, y) {
  const geometry = gridGeometry();
  if (y < HEADER_HEIGHT || x < 0 || x >= geometry.width - GUTTER_WIDTH) return null;

  const column = Math.floor(x / geometry.cellWidth);
  const row = Math.floor((y - HEADER_HEIGHT) / geometry.cellHeight);
  if (column < 0 || column >= COLUMNS || row < 0 || row >= ROWS) return null;

  return { column, row, note: noteAt(column, row) };
}

function paintDeadCell (rect, labelColor) {
  // greyed and hatched, and never clickable -- selectnote() in sndwrksMap.js
  // clamps out-of-range notes to 127 silently, so a click here must be
  // swallowed entirely rather than clamped, or it would select B8 with no
  // feedback at all. see onclick() below.
  mgraphics.set_source_rgba(labelColor[0], labelColor[1], labelColor[2], 0.12);
  mgraphics.rectangle(rect.x, rect.y, rect.w, rect.h);
  mgraphics.fill();

  mgraphics.set_source_rgba(labelColor[0], labelColor[1], labelColor[2], 0.35);
  mgraphics.set_line_width(1);
  mgraphics.move_to(rect.x + 2, rect.y + 2);
  mgraphics.line_to(rect.x + rect.w - 2, rect.y + rect.h - 2);
  mgraphics.move_to(rect.x + rect.w - 2, rect.y + 2);
  mgraphics.line_to(rect.x + 2, rect.y + rect.h - 2);
  mgraphics.stroke();
}

function paintHeader (geometry, labelColor) {
  mgraphics.set_source_rgba(labelColor);
  mgraphics.select_font_face('Ableton Sans');
  mgraphics.set_font_size(9);

  for (let column = 0; column < COLUMNS; column += 1) {
    const name = PITCH_CLASS_NAMES[column];
    const [textWidth, textHeight] = mgraphics.text_measure(name);
    const x = column * geometry.cellWidth + (geometry.cellWidth - textWidth) / 2;
    const y = (HEADER_HEIGHT + textHeight) / 2;
    mgraphics.move_to(x, y);
    mgraphics.show_text(name);
  }
}

function paintGutter (geometry, labelColor) {
  mgraphics.set_source_rgba(labelColor);
  mgraphics.select_font_face('Ableton Sans');
  mgraphics.set_font_size(9);

  const gutterRight = geometry.width - 3; // right-justified against the gutter, 3px margin
  for (let row = 0; row < ROWS; row += 1) {
    const label = String(octaveOf(row));
    const [textWidth, textHeight] = mgraphics.text_measure(label);
    const rect = cellRect(0, row, geometry);
    mgraphics.move_to(gutterRight - textWidth, rect.y + (rect.h + textHeight) / 2);
    mgraphics.show_text(label);
  }
}

function paint () {
  const geometry = gridGeometry();
  const bodyColor = themeColor('live_lcd_bg', FALLBACK_BODY);
  // live has no "black key" theme token, so darken the body colour rather
  // than guessing at a name for one
  const blackKeyColor = shade(bodyColor, 0.72);
  const labelColor = themeColor('live_control_fg_off', FALLBACK_DIM);
  const selectionColor = themeColor('live_control_selection', FALLBACK_SELECTION);

  mgraphics.set_source_rgba(bodyColor);
  mgraphics.rectangle(0, 0, geometry.width, geometry.height);
  mgraphics.fill();

  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const note = noteAt(column, row);
      const rect = cellRect(column, row, geometry);

      mgraphics.set_source_rgba(BLACK_KEY_COLUMNS[column] ? blackKeyColor : bodyColor);
      mgraphics.rectangle(rect.x, rect.y, rect.w, rect.h);
      mgraphics.fill();

      if (isDeadNote(note)) {
        paintDeadCell(rect, labelColor);
        continue;
      }

      if (mappedNotes[note]) {
        mgraphics.set_source_rgba(MAPPED_FILL);
        mgraphics.rectangle(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
        mgraphics.fill();
      }

      if (note === hoverNote) {
        mgraphics.set_source_rgba(selectionColor[0], selectionColor[1], selectionColor[2], 0.22);
        mgraphics.rectangle(rect.x, rect.y, rect.w, rect.h);
        mgraphics.fill();
      }

      // drawn last and over the fill, so a mapped-and-selected cell shows both states at once
      if (note === selectedNote) {
        mgraphics.set_source_rgba(selectionColor);
        mgraphics.set_line_width(1.5);
        mgraphics.rectangle(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
        mgraphics.stroke();
      }
    }
  }

  paintHeader(geometry, labelColor);
  paintGutter(geometry, labelColor);
}

// "clearmapped" -- forget every mapped note. sndwrksMap.js sends this at the top of
// every repaint and then one "mapnote" per note, so the set is rebuilt from scratch
// each time rather than diffed. matrixctrl needed the diff machinery this grid
// replaces because its own "clear" echoed back out and re-entered the handler, which
// is the stack overflow documented in the README's gotchas table. owning the drawing
// removes that class of bug outright: nothing here ever answers back.
function clearmapped () {
  if (DEBUG) post('sndwrksGrid: clearmapped\n');
  mappedNotes = {};
  mgraphics.redraw();
}

// "mapnote <n>" -- one mapped note for the current layer. arriving one at a time is
// not a performance problem: mgraphics.redraw() invalidates the object rather than
// painting it, so 128 of these still coalesce into a single repaint.
function mapnote (n) {
  const note = parseInt(n, 10);
  if (Number.isNaN(note)) return;
  if (DEBUG) post(`sndwrksGrid: mapnote ${note}\n`);
  mappedNotes[note] = true;
  mgraphics.redraw();
}

function selected (n) {
  const note = parseInt(n, 10);
  if (DEBUG) post(`sndwrksGrid: selected ${n}\n`);
  selectedNote = Number.isNaN(note) ? null : note;
  mgraphics.redraw();
}

// this object had no catch-all, which is exactly why the old 'mapped' message could
// go missing without a word in the Max window. anything that is not a handler above
// now lands here, and a bare list -- what Max would deliver if a sender ever passed
// its atoms as one array again -- is called out by name rather than being dropped.
function anything () {
  if (!DEBUG) return;
  post(`sndwrksGrid: UNHANDLED "${messagename}" ${arrayfromargs(arguments).join(' ')}\n`);
}

function list () {
  if (!DEBUG) return;
  const atoms = arrayfromargs(arguments).join(' ');
  post(`sndwrksGrid: bare list ${atoms} -- sender should use a selector\n`);
}

function onclick (x, y) {
  const hit = hitTest(x, y);
  if (!hit || isDeadNote(hit.note)) return; // dead cells swallow clicks entirely -- never clamp
  outlet(0, 'selectnote', hit.note);
}
onclick.local = 1; // private -- not a message selector this object should answer to

function onidle (x, y) {
  const hit = hitTest(x, y);
  const note = (hit && !isDeadNote(hit.note)) ? hit.note : null;
  if (note === hoverNote) return;
  hoverNote = note;
  mgraphics.redraw();
}
onidle.local = 1;

function onidleout () {
  if (hoverNote === null) return;
  hoverNote = null;
  mgraphics.redraw();
}
onidleout.local = 1;

function onresize () {
  mgraphics.redraw();
}
onresize.local = 1;
