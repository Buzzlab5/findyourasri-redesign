/**
 * Turns the Calico Jack Charters originals in _src/img/Calico Jack Charters
 * into what the Production project ships (see lib/projects.ts):
 *
 *   public/img/work/travel/calico-jack-charters/
 *     cover.jpg             the hero, from header.JPG: 2400px long edge
 *     tile.jpg              the grid tile, from cover.JPG: 1100px tall
 *     01.jpg, 02.jpg, 03.jpg the three stills on the rail, long edge 1900px
 *   public/video/work/      a poster frame for each film (local, like the others)
 *   _src/video/bunny/calico-jack-charters/
 *                           the two films, full and phone cut, to upload to the
 *                           root of the Bunny storage zone (gitignored)
 *
 *   node scripts/optimize-calico-jack.mjs
 *
 * The logo goes through scripts/optimize-campaign-logos.mjs. Images are sRGB,
 * EXIF removed, progressive mozjpeg. Films are H.264 + AAC with the index at the
 * front (faststart), so they start playing before they finish downloading. Both
 * are 9:16 phone footage, so the full cut is 1080x1920 (the camera's size, never
 * scaled up) and the phone cut is 720x1280. Prints the sizes to put in lib/projects.ts.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import sharp from 'sharp';

const SRC = '_src/img/Calico Jack Charters';
const OUT = 'public/img/work/travel/calico-jack-charters';
const BUNNY = '_src/video/bunny/calico-jack-charters';
const POSTERS = 'public/video/work';

const kb = (path) => `${(statSync(path).size / 1024).toFixed(0)}KB`;
const mb = (path) => `${(statSync(path).size / 1024 / 1024).toFixed(1)}MB`;
const base = (file) => sharp(`${SRC}/${file}`).rotate().toColourspace('srgb');
const jpeg = (quality) => ({ quality, mozjpeg: true, progressive: true });

mkdirSync(OUT, { recursive: true });
mkdirSync(BUNNY, { recursive: true });
mkdirSync(POSTERS, { recursive: true });

// The hero is header.JPG (long edge 2400px); the grid tile is cover.JPG (1100px tall).
{
  const { width, height } = await base('header.JPG').toBuffer({ resolveWithObject: true }).then((r) => r.info);
  const k = Math.min(1, 2400 / Math.max(width, height));
  const c = await base('header.JPG')
    .resize(Math.round(width * k), Math.round(height * k), { kernel: 'lanczos3' })
    .jpeg(jpeg(78))
    .toFile(`${OUT}/cover.jpg`);
  const t = await base('cover.JPG').resize({ height: 1100, kernel: 'lanczos3' }).jpeg(jpeg(76)).toFile(`${OUT}/tile.jpg`);
  console.log(`cover: { w: ${c.width}, h: ${c.height} }  ${kb(`${OUT}/cover.jpg`)}`);
  console.log(`tile:  { w: ${t.width}, h: ${t.height} }  ${kb(`${OUT}/tile.jpg`)}`);
}

const STILLS = [
  { from: 'galery-slide1.JPG', to: '01.jpg', edge: 1900 },
  { from: 'galery-slide2.JPG', to: '02.jpg', edge: 1900 },
  { from: 'galery-slide4.jpg', to: '03.jpg', edge: 1900 },
];

for (const { from, to, edge } of STILLS) {
  const o = await base(from)
    .resize({ width: edge, height: edge, fit: 'inside', withoutEnlargement: true, kernel: 'lanczos3' })
    .jpeg(jpeg(78))
    .toFile(`${OUT}/${to}`);
  console.log(`${to}  w: ${o.width}, h: ${o.height}  ${kb(`${OUT}/${to}`)}`);
}

const FILMS = [
  { from: 'galeri-slide3.MP4', name: 'calico-jack-sailing' },
  { from: 'galery-slide5.MOV', name: 'calico-jack-manta' },
];

const ffmpeg = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });

for (const { from, name } of FILMS) {
  const input = `${SRC}/${from}`;
  for (const { suffix, height, crf, maxrate, bufsize } of [
    { suffix: '', height: 1920, crf: 23, maxrate: '5M', bufsize: '10M' },
    { suffix: '-sm', height: 1280, crf: 25, maxrate: '2200k', bufsize: '4400k' },
  ]) {
    const out = `${BUNNY}/${name}${suffix}.mp4`;
    ffmpeg([
      '-i', input,
      '-map', '0:v:0', '-map', '0:a:0?',
      '-vf', `scale=-2:${height}:flags=lanczos,format=yuv420p`,
      '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-crf', String(crf),
      '-maxrate', maxrate, '-bufsize', bufsize,
      '-r', '30', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
      '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
      '-movflags', '+faststart',
      out,
    ]);
    console.log(`${out}  ${mb(out)}`);
  }

  // The poster is a frame a few seconds in, at the phone cut's size.
  const poster = `${POSTERS}/${name}.jpg`;
  ffmpeg(['-ss', '3', '-i', input, '-frames:v', '1', '-vf', 'scale=-2:1280:flags=lanczos', '-q:v', '4', poster]);
  const p = await sharp(poster).metadata();
  console.log(`${poster}  ${p.width}x${p.height}  ${kb(poster)}`);
}
