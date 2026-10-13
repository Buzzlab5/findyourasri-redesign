/**
 * Builds the web copies for each project's mosaic (`more` in lib/projects.ts)
 * from the originals in _src/img/New Gallery Images: long edge 1600px, sRGB,
 * EXIF removed, progressive mozjpeg, saved as more-NN.jpg beside the
 * project's other pictures. Within a project the pictures are placed in the
 * mosaic's slot order (see ProjectMosaic): landscape for slots 1 to 3,
 * portrait for 4 to 6, repeating. Prints the entries for lib/projects.ts.
 *
 *   node scripts/optimize-mosaic.mjs [outDir]
 */
import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import sharp from 'sharp';

const SRC = '_src/img/New Gallery Images';
const OUT = process.argv[2] ?? 'public/img/work';
const EDGE = 1600;

const FOLDERS = {
  'Anne-Bonny-New': 'travel/anne-bonny',
  'Bhutan-Peaceful-Tours-New': 'travel/bhutan-peaceful-tours',
  'Nepal-New': 'travel/nepal',
  'Phinisi-Armada-New': 'travel/phinisi-armada',
  'Wonderful-Indonesia-New': 'travel/wonderful-indonesia',
  'Bingin-Tree-Tops-New': 'hospitality/bingin-tree-tops',
  'Desa-Hay-Bali-New': 'hospitality/desa-hay-bali',
  'Marriot-Bonvoy-New': 'hospitality/marriott-bonvoy',
  'Find-Your-Asri-New': 'products/find-your-asri',
  'Next-Stop-New': 'products/next-stop',
  'San-Marzano-New': 'products/san-marzano-wine',
};

const WANT = ['land', 'land', 'land', 'port', 'port', 'port'];

const results = {};
for (const [folder, dest] of Object.entries(FOLDERS)) {
  const files = readdirSync(`${SRC}/${folder}`)
    .filter((f) => /\.jpe?g$/i.test(f))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

  const dir = `${OUT}/${dest}`;
  mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(dir)) if (/^more-\d+\.jpg$/.test(f)) rmSync(`${dir}/${f}`);

  // Resize first (into memory) so the order can follow the shapes.
  const pics = [];
  for (const f of files) {
    const { data, info } = await sharp(`${SRC}/${folder}/${f}`)
      .rotate()
      .toColourspace('srgb')
      .resize({ width: EDGE, height: EDGE, fit: 'inside', withoutEnlargement: true, kernel: 'lanczos3' })
      .jpeg({ quality: 76, mozjpeg: true, progressive: true })
      .toBuffer({ resolveWithObject: true });
    pics.push({ f, data, w: info.width, h: info.height, shape: info.width >= info.height ? 'land' : 'port' });
  }

  // Slot by slot, take the first unused picture whose shape fits; if none does, the first left.
  const left = [...pics];
  const ordered = [];
  while (left.length) {
    const want = WANT[ordered.length % WANT.length];
    const at = left.findIndex((p) => p.shape === want);
    ordered.push(...left.splice(at === -1 ? 0 : at, 1));
  }

  results[dest] = [];
  for (const [i, p] of ordered.entries()) {
    const name = `more-${String(i + 1).padStart(2, '0')}.jpg`;
    await sharp(p.data).toFile(`${dir}/${name}`);
    results[dest].push({ src: `/img/work/${dest}/${name}`, w: p.w, h: p.h, from: p.f, kb: Math.round(statSync(`${dir}/${name}`).size / 1024) });
  }
}
console.log(JSON.stringify(results, null, 1));
