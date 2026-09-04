/**
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

// lime margin held clear on all four sides, in box pixels. the source artwork carries
// its own generous padding around the wordmark; the first cut of this object did not,
// and at the old 33px strip width the mark filled 32.47 of 33 pixels -- a quarter of a
// pixel per side -- so the letterform bowls sat under the v8ui object's own 1px border
// and read as clipped. build-patch.py widens the strip to keep the mark height-limited
// with this padding subtracted; LOGO_MIN_W there is derived from this number, so the
// two must move together.
const LOGO_PADDING = 4;

// BEGIN GENERATED: tools/svgToMgraphics.py — do not hand-edit between these markers
// letterform outlines traced from the sndwrks wordmark SVG
// regenerate with: python3 tools/svgToMgraphics.py
// each letter is a list of subpaths (a second subpath is the
// counter/hole in "d"); each subpath is a list of ops,
// ['M', x, y] / ['L', x, y] / ['C', x1, y1, x2, y2, x, y] / ['Z'],
// in original svg-artboard coordinates (not yet scaled or rotated).
const LOGO_LETTERFORMS = [
  [
    [
      ['M', 73.1, 72.5],
      ['C', 70.4, 68.7, 66.8, 66.8, 62.2, 66.8],
      ['C', 57.6, 66.8, 58.5, 67.3, 56.8, 68.2],
      ['C', 55, 69.1, 54.1, 70.6, 54.1, 72.7],
      ['C', 54.1, 74.8, 54.8, 75.6, 56.3, 76.4],
      ['C', 57.8, 77.2, 59.6, 77.8, 61.9, 78.4],
      ['C', 64.1, 78.9, 66.6, 79.5, 69.1, 80.1],
      ['C', 71.7, 80.7, 74.1, 81.6, 76.3, 82.8],
      ['C', 78.5, 84, 80.4, 85.6, 81.9, 87.7],
      ['C', 83.4, 89.8, 84.1, 92.6, 84.1, 96.3],
      ['C', 84.1, 100, 83.4, 102.4, 82, 104.7],
      ['C', 80.6, 107, 78.7, 108.8, 76.4, 110.2],
      ['C', 74.1, 111.6, 71.6, 112.6, 68.7, 113.2],
      ['C', 65.8, 113.8, 63, 114.1, 60.1, 114.1],
      ['C', 55.8, 114.1, 51.8, 113.5, 48.2, 112.2],
      ['C', 44.6, 111, 41.3, 108.7, 38.5, 105.5],
      ['L', 47.8, 96.8],
      ['C', 49.6, 98.8, 51.5, 100.4, 53.5, 101.7],
      ['C', 55.5, 103, 58, 103.6, 61, 103.6],
      ['C', 64, 103.6, 63, 103.5, 64.1, 103.3],
      ['C', 65.2, 103.1, 66.2, 102.7, 67.1, 102.1],
      ['C', 68, 101.6, 68.8, 100.9, 69.4, 100.1],
      ['C', 70, 99.3, 70.3, 98.3, 70.3, 97.3],
      ['C', 70.3, 95.4, 69.6, 93.9, 68.1, 93],
      ['C', 66.6, 92.1, 64.8, 91.3, 62.5, 90.7],
      ['C', 60.3, 90.1, 57.8, 89.6, 55.3, 89.1],
      ['C', 52.7, 88.6, 50.3, 87.8, 48.1, 86.7],
      ['C', 45.9, 85.6, 44, 84, 42.5, 82],
      ['C', 41, 80, 40.3, 77.2, 40.3, 73.7],
      ['C', 40.3, 70.2, 40.9, 67.9, 42.2, 65.7],
      ['C', 43.5, 63.4, 45.2, 61.6, 47.2, 60.1],
      ['C', 49.3, 58.6, 51.7, 57.6, 54.4, 56.9],
      ['C', 57.1, 56.2, 59.8, 55.9, 62.6, 55.9],
      ['C', 65.4, 55.9, 70, 56.5, 73.6, 57.8],
      ['C', 77.2, 59.1, 80.2, 61.3, 82.4, 64.3],
      ['L', 73.1, 72.6],
      ['Z'],
    ],
  ],
  [
    [
      ['M', 94.9, 57.1],
      ['L', 108.1, 57.1],
      ['L', 108.1, 66],
      ['L', 108.3, 66],
      ['C', 109.6, 63.2, 111.6, 60.8, 114.3, 58.8],
      ['C', 117, 56.8, 120.7, 55.7, 125.3, 55.7],
      ['C', 129.9, 55.7, 132.2, 56.3, 134.7, 57.6],
      ['C', 137.3, 58.8, 139.4, 60.5, 141, 62.5],
      ['C', 142.6, 64.5, 143.8, 66.8, 144.5, 69.4],
      ['C', 145.2, 72, 145.5, 74.8, 145.5, 77.6],
      ['L', 145.5, 112.7],
      ['L', 131.6, 112.7],
      ['L', 131.6, 84.6],
      ['C', 131.6, 83.1, 131.6, 81.3, 131.4, 79.4],
      ['C', 131.2, 77.5, 130.8, 75.7, 130.2, 74.1],
      ['C', 129.5, 72.4, 128.5, 71.1, 127.1, 69.9],
      ['C', 125.7, 68.8, 123.8, 68.2, 121.4, 68.2],
      ['C', 119, 68.2, 117.1, 68.6, 115.6, 69.4],
      ['C', 114, 70.2, 112.7, 71.2, 111.7, 72.5],
      ['C', 110.7, 73.8, 109.9, 75.3, 109.4, 77],
      ['C', 108.9, 78.7, 108.7, 80.5, 108.7, 82.3],
      ['L', 108.7, 112.6],
      ['L', 94.8, 112.6],
      ['L', 94.8, 57.1],
      ['Z'],
    ],
  ],
  [
    [
      ['M', 205.4, 104.3],
      ['L', 205.2, 104.3],
      ['C', 203.2, 107.7, 200.5, 110.2, 197.1, 111.7],
      ['C', 193.7, 113.2, 190, 114, 186.1, 114],
      ['C', 182.2, 114, 177.9, 113.2, 174.6, 111.7],
      ['C', 171.2, 110.2, 168.4, 108.1, 166, 105.5],
      ['C', 163.6, 102.9, 161.8, 99.8, 160.6, 96.2],
      ['C', 159.4, 92.6, 158.7, 88.8, 158.7, 84.7],
      ['C', 158.7, 80.6, 159.4, 76.8, 160.7, 73.2],
      ['C', 162, 69.6, 163.8, 66.6, 166.2, 63.9],
      ['C', 168.6, 61.3, 171.4, 59.2, 174.7, 57.7],
      ['C', 178, 56.2, 181.7, 55.4, 185.6, 55.4],
      ['C', 189.5, 55.4, 190.5, 55.7, 192.5, 56.2],
      ['C', 194.5, 56.7, 196.3, 57.4, 197.8, 58.3],
      ['C', 199.3, 59.2, 200.7, 60.1, 201.7, 61],
      ['C', 202.8, 62, 203.7, 62.9, 204.4, 63.8],
      ['L', 204.7, 63.8],
      ['L', 204.7, 25.1],
      ['L', 218.6, 25.1],
      ['L', 218.6, 112.6],
      ['L', 205.4, 112.6],
      ['L', 205.4, 104.3],
      ['Z'],
    ],
    [
      ['M', 172.5, 84.8],
      ['C', 172.5, 87, 172.9, 89, 173.6, 91.1],
      ['C', 174.3, 93.1, 175.4, 94.9, 176.8, 96.4],
      ['C', 178.2, 97.9, 179.9, 99.2, 182, 100.1],
      ['C', 184, 101, 186.3, 101.5, 188.8, 101.5],
      ['C', 191.3, 101.5, 193.6, 101, 195.6, 100.1],
      ['C', 197.6, 99.2, 199.3, 97.9, 200.8, 96.4],
      ['C', 202.2, 94.9, 203.3, 93.1, 204, 91.1],
      ['C', 204.7, 89.1, 205.1, 87, 205.1, 84.8],
      ['C', 205.1, 82.6, 204.7, 80.6, 204, 78.5],
      ['C', 203.3, 76.5, 202.2, 74.7, 200.8, 73.2],
      ['C', 199.4, 71.7, 197.7, 70.4, 195.6, 69.5],
      ['C', 193.6, 68.6, 191.3, 68.1, 188.8, 68.1],
      ['C', 186.3, 68.1, 184, 68.6, 182, 69.5],
      ['C', 180, 70.4, 178.3, 71.7, 176.8, 73.2],
      ['C', 175.4, 74.7, 174.3, 76.5, 173.6, 78.5],
      ['C', 172.9, 80.5, 172.5, 82.6, 172.5, 84.8],
      ['Z'],
    ],
  ],
  [
    [
      ['M', 226.8, 57.1],
      ['L', 241.9, 57.1],
      ['L', 253.9, 96],
      ['L', 254.1, 96],
      ['L', 265.3, 57.1],
      ['L', 280.4, 57.1],
      ['L', 292.4, 96],
      ['L', 292.6, 96],
      ['L', 304.2, 57.1],
      ['L', 318.2, 57.1],
      ['L', 299.3, 112.7],
      ['L', 285.5, 112.7],
      ['L', 272.3, 74.7],
      ['L', 272.1, 74.7],
      ['L', 260.4, 112.7],
      ['L', 246, 112.7],
      ['L', 226.7, 57.1],
      ['Z'],
    ],
  ],
  [
    [
      ['M', 326.5, 57.1],
      ['L', 340.4, 57.1],
      ['L', 340.4, 65.9],
      ['L', 340.6, 65.9],
      ['C', 342.1, 62.7, 344.3, 60.1, 347.2, 58.4],
      ['C', 350.1, 56.6, 353.3, 55.7, 357, 55.7],
      ['C', 360.7, 55.7, 358.7, 55.7, 359.5, 55.9],
      ['C', 360.3, 56.1, 361.1, 56.2, 362, 56.5],
      ['L', 362, 69.9],
      ['C', 360.8, 69.6, 359.7, 69.3, 358.6, 69.1],
      ['C', 357.5, 68.9, 356.4, 68.8, 355.3, 68.8],
      ['C', 352.1, 68.8, 349.5, 69.4, 347.5, 70.6],
      ['C', 345.5, 71.8, 344, 73.2, 343, 74.7],
      ['C', 342, 76.2, 341.3, 77.8, 340.9, 79.3],
      ['C', 340.6, 80.8, 340.4, 82, 340.4, 82.8],
      ['L', 340.4, 112.6],
      ['L', 326.5, 112.6],
      ['L', 326.5, 57.1],
      ['Z'],
    ],
  ],
  [
    [
      ['M', 371.6, 25.1],
      ['L', 385.5, 25.1],
      ['L', 385.5, 80.1],
      ['L', 406.9, 57.1],
      ['L', 424.7, 57.1],
      ['L', 400.8, 82.3],
      ['L', 426.2, 112.6],
      ['L', 407.8, 112.6],
      ['L', 385.7, 84.2],
      ['L', 385.5, 84.2],
      ['L', 385.5, 112.6],
      ['L', 371.6, 112.6],
      ['L', 371.6, 25.1],
      ['Z'],
    ],
  ],
  [
    [
      ['M', 463.4, 72.5],
      ['C', 460.7, 68.7, 457.1, 66.8, 452.5, 66.8],
      ['C', 447.9, 66.8, 448.8, 67.3, 447.1, 68.2],
      ['C', 445.3, 69.1, 444.4, 70.6, 444.4, 72.7],
      ['C', 444.4, 74.8, 445.1, 75.6, 446.6, 76.4],
      ['C', 448.1, 77.2, 449.9, 77.8, 452.2, 78.4],
      ['C', 454.4, 78.9, 456.9, 79.5, 459.4, 80.1],
      ['C', 462, 80.7, 464.4, 81.6, 466.6, 82.8],
      ['C', 468.8, 84, 470.7, 85.6, 472.2, 87.7],
      ['C', 473.7, 89.8, 474.4, 92.6, 474.4, 96.3],
      ['C', 474.4, 100, 473.7, 102.4, 472.3, 104.7],
      ['C', 470.9, 107, 469, 108.8, 466.7, 110.2],
      ['C', 464.4, 111.6, 461.9, 112.6, 459, 113.2],
      ['C', 456.1, 113.8, 453.3, 114.1, 450.4, 114.1],
      ['C', 446.1, 114.1, 442.1, 113.5, 438.5, 112.2],
      ['C', 434.9, 111, 431.6, 108.7, 428.8, 105.5],
      ['L', 438.1, 96.8],
      ['C', 439.9, 98.8, 441.8, 100.4, 443.8, 101.7],
      ['C', 445.8, 103, 448.3, 103.6, 451.3, 103.6],
      ['C', 454.3, 103.6, 453.3, 103.5, 454.4, 103.3],
      ['C', 455.5, 103.1, 456.5, 102.7, 457.4, 102.1],
      ['C', 458.3, 101.6, 459.1, 100.9, 459.7, 100.1],
      ['C', 460.3, 99.3, 460.6, 98.3, 460.6, 97.3],
      ['C', 460.6, 95.4, 459.9, 93.9, 458.4, 93],
      ['C', 456.9, 92.1, 455.1, 91.3, 452.8, 90.7],
      ['C', 450.6, 90.1, 448.1, 89.6, 445.6, 89.1],
      ['C', 443, 88.6, 440.6, 87.8, 438.4, 86.7],
      ['C', 436.2, 85.6, 434.3, 84, 432.8, 82],
      ['C', 431.3, 80, 430.6, 77.2, 430.6, 73.7],
      ['C', 430.6, 70.2, 431.2, 67.9, 432.5, 65.7],
      ['C', 433.8, 63.4, 435.5, 61.6, 437.5, 60.1],
      ['C', 439.6, 58.6, 442, 57.6, 444.7, 56.9],
      ['C', 447.4, 56.2, 450.1, 55.9, 452.9, 55.9],
      ['C', 455.7, 55.9, 460.3, 56.5, 463.9, 57.8],
      ['C', 467.5, 59.1, 470.5, 61.3, 472.7, 64.3],
      ['L', 463.4, 72.6],
      ['Z'],
    ],
  ],
];

// letterform bounding box (anchor points and bezier control points),
// computed from the parsed paths above, not hardcoded — see
// compute_bbox() in tools/svgToMgraphics.py.
const LOGO_BBOX = {
  minX: 38.5,
  minY: 25.1,
  maxX: 474.4,
  maxY: 114.1,
};
// END GENERATED

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
//
// the fit is against the box INSET by LOGO_PADDING on all four sides, not the box
// itself: the mark is centred in that inner rect and the padding stays lime, because
// paint() below still fills the whole box.
function drawWordmark (boxWidth, boxHeight) {
  const bboxWidth = LOGO_BBOX.maxX - LOGO_BBOX.minX;
  const bboxHeight = LOGO_BBOX.maxY - LOGO_BBOX.minY;
  const innerWidth = Math.max(0, boxWidth - 2 * LOGO_PADDING);
  const innerHeight = Math.max(0, boxHeight - 2 * LOGO_PADDING);
  const scale = Math.min(innerHeight / bboxWidth, innerWidth / bboxHeight);
  const offsetX = LOGO_PADDING + (innerWidth - bboxHeight * scale) / 2;
  const offsetY = LOGO_PADDING + (innerHeight - bboxWidth * scale) / 2;

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
  // build-patch.py may still adjust the strip width — so the scale below is
  // always derived from the box's actual size at draw time, never from a
  // hardcoded 40 x 159.
  const boxWidth = box.rect[2] - box.rect[0];
  const boxHeight = box.rect[3] - box.rect[1];

  mgraphics.set_source_rgba(LOGO_FILL_BG);
  mgraphics.rectangle(0, 0, boxWidth, boxHeight);
  mgraphics.fill();

  drawWordmark(boxWidth, boxHeight);
}
