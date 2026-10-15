/**
 * Turns the client logos in _src/img/Campaign Logos into the small white marks
 * that sit in the top-left of a Production tile (see .work-tile__logo in
 * globals.css, which draws them as a CSS mask, so only the alpha channel matters).
 *
 *   node scripts/optimize-campaign-logos.mjs
 *
 * Each logo is trimmed of its empty margin, flattened to white and resized to
 * 3x the size it is shown at. Where a project has no logo yet, add its file to
 * LOGOS below and run again; then give the project a `logo` in lib/projects.ts
 * from the sizes this prints.
 */
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import sharp from 'sharp';

const SRC = '_src/img/Campaign Logos';
const OUT = 'public/img/work';

/** The box a mark is shown in, in CSS px. */
const BOX = { w: 88, h: 44 };
const SCALE = 3;

/**
 * file → project folder. `mode` decides how colour becomes alpha:
 *   shape  keep the logo's own alpha (single-colour marks, any colour);
 *   knock  light details inside a flag-like mark become holes;
 *   tone   lighter areas turn more see-through, so a layered mark keeps its layers.
 */
const LOGOS = [
  // `from` reads a logo already in public/img instead of the drop folder; `box` widens the box for a thin mark.
  { from: 'public/img/asri-white.png', to: 'products/find-your-asri', mode: 'shape', box: { w: 104, h: 44 } },
  { from: 'public/img/logo-indonesia.png', to: 'travel/wonderful-indonesia', mode: 'shape' },
  { file: 'cocosolis-logo.svg', to: 'products/cocosolis', mode: 'shape', box: { w: 104, h: 50 } },
  { file: 'desahay-logo.png', to: 'hospitality/desa-hay-bali', mode: 'shape', box: { w: 96, h: 48 } },
  { file: 'ecosix-fix.png', to: 'hospitality/eco-six', mode: 'shape' },
  { file: 'hidden-hills-vila-logo.png', to: 'hospitality/hidden-hills-villas', mode: 'shape', box: { w: 96, h: 44 } },
  { file: 'anne-bonny-logo.svg', to: 'travel/anne-bonny', mode: 'shape' },
  { from: '_src/img/Calico Jack Charters/calico-jack-charters-logo.avif', to: 'travel/calico-jack-charters', mode: 'shape' },
  { file: 'bhutan-peaceful-logo.webp', to: 'travel/bhutan-peaceful-tours', mode: 'tone' },
  { file: 'nepal-logo.png', to: 'travel/nepal', mode: 'knock' },
  { file: 'marriot-bonvoy-logo.png', to: 'hospitality/marriott-bonvoy', mode: 'shape' },
  { file: 'flanagan-logo.png', to: 'products/flanagan-surfboards', mode: 'shape' },
  { file: 'sanmarzano-logo.png', to: 'products/san-marzano-wine', mode: 'shape' },
];

const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

async function whiten({ file, from, mode, box = BOX }) {
  const input = readFileSync(from ?? `${SRC}/${file}`);
  // Rasterise at a size well above the output so an SVG stays crisp.
  const base = sharp(input, { density: 600 }).ensureAlpha();
  const { data, info } = await base.raw().toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    const l = luma(data[i], data[i + 1], data[i + 2]);
    let alpha = a;
    if (mode === 'knock' && l > 215) alpha = 0;
    if (mode === 'tone') alpha = Math.round(a * (1 - 0.55 * (l / 255)));
    data[i] = data[i + 1] = data[i + 2] = 255;
    data[i + 3] = alpha;
  }

  // Trim the empty margin: the bounding box of everything that is visible.
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  const width = x1 - x0 + 1;
  const height = y1 - y0 + 1;
  const t = sharp(data, { raw: info }).extract({ left: x0, top: y0, width, height });

  // Fit the box by whichever side runs out first.
  const k = Math.min(box.w / width, box.h / height);
  const w = Math.round(width * k);
  const h = Math.round(height * k);
  return { buf: await t.resize(w * SCALE, h * SCALE, { kernel: 'lanczos3' }).png({ compressionLevel: 9, palette: false }).toBuffer(), w, h };
}

for (const logo of LOGOS) {
  const source = logo.from ?? `${SRC}/${logo.file}`;
  if (!existsSync(source)) {
    console.log(`skip  ${source} (not there yet)`);
    continue;
  }
  const { buf, w, h } = await whiten(logo);
  const dest = `${OUT}/${logo.to}/logo.png`;
  mkdirSync(dirname(dest), { recursive: true });
  await sharp(buf).toFile(dest);
  console.log(`${logo.to.padEnd(34)} logo: { src: '/img/work/${logo.to}/logo.png', w: ${w}, h: ${h} }  ${(statSync(dest).size / 1024).toFixed(1)}KB`);
}
