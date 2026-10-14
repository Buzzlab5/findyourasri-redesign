/**
 * About page hero: the praying portrait, long edge 2400px, sRGB, EXIF removed,
 * progressive mozjpeg, saved over public/img/about-hero.jpg. Prints the w/h
 * for the aboutHero frame in lib/content.ts.
 *
 *   node scripts/optimize-about-hero.mjs
 */
import { statSync } from 'node:fs';
import sharp from 'sharp';

const FROM = '_src/img/2V5A6384-Edit-Edit-3.jpg';
const TO = 'public/img/about-hero.jpg';

const info = await sharp(FROM)
  .rotate()
  .toColourspace('srgb')
  .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true, kernel: 'lanczos3' })
  .jpeg({ quality: 76, mozjpeg: true, progressive: true })
  .toFile(TO);
console.log(`${TO}  w: ${info.width}, h: ${info.height}  ${(statSync(TO).size / 1024).toFixed(0)}KB`);
