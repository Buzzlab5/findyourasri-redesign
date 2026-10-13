'use client';

import { useRef, useState } from 'react';

import Lightbox from '@/components/Lightbox';
import { MOSAIC_PLACEHOLDERS, type ProjectImage } from '@/lib/projects';

/**
 * Tiles are laid out in blocks that each fill a whole row of the grid, so the
 * edges stay even whatever the number of pictures:
 *   a  one large and two small stacked beside it (every other one mirrored)
 *   b  three tall
 *   c  two square, used for the last two or four pictures
 *   d  one wide, only when there is a single picture
 * Blocks alternate a, b, a, b and so on.
 */
export function mosaicTiles(count: number): string[] {
  if (count <= 0) return [];
  if (count === 1) return ['d'];
  const rest = count % 3;
  // A single left over would be an orphan, so the last block grows to four.
  const blocks = Math.floor(count / 3) - (rest === 1 ? 1 : 0);
  const tiles: string[] = [];
  let flips = 0;
  for (let i = 0; i < blocks; i++) {
    if (i % 2) tiles.push('b1', 'b2', 'b3');
    else {
      const flip = flips++ % 2 ? ' mosaic__tile--flip' : '';
      tiles.push(`a1${flip}`, `a2${flip}`, `a3${flip}`);
    }
  }
  if (rest) tiles.push('c', 'c');
  if (rest === 1) tiles.push('c', 'c');
  return tiles;
}

/**
 * The stills under a project's rail. Each picture is cropped to its tile and
 * opens in the lightbox. With no pictures yet, it draws empty tiles so the
 * layout can be reviewed.
 */
export default function ProjectMosaic({ title, items }: { title: string; items: ProjectImage[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  const slots = items.length ? items.length : MOSAIC_PLACEHOLDERS;
  if (!slots) return null;
  const tiles = mosaicTiles(slots);

  return (
    <section className="section mosaic" aria-label={`${title}: more pictures`}>
      <h2 className="sec-title sec-title--gap line-mask">Gallery</h2>
      <div className="mosaic__grid">
        {Array.from({ length: slots }, (_, i) => {
          const image = items[i];
          return image ? (
            <button
              key={image.src}
              type="button"
              className={`mosaic__tile mosaic__tile--${tiles[i]}`}
              aria-label={`Open picture ${i + 1} of ${items.length}`}
              onClick={(event) => {
                openerRef.current = event.currentTarget;
                setLightbox(i);
              }}
            >
              <img
                src={image.src}
                alt={image.alt}
                width={image.w}
                height={image.h}
                loading="lazy"
                decoding="async"
                draggable={false}
                style={image.pos ? { objectPosition: image.pos } : undefined}
              />
            </button>
          ) : (
            <div key={i} className={`mosaic__tile mosaic__tile--${tiles[i]} mosaic__tile--empty`} aria-hidden="true">
              <span>{String(i + 1).padStart(2, '0')}</span>
            </div>
          );
        })}
      </div>

      <Lightbox
        items={items.map((m) => ({ ...m, title }))}
        index={lightbox}
        restoreFocusTo={openerRef}
        onClose={() => setLightbox(null)}
        onStep={(delta) =>
          setLightbox((current) =>
            current === null ? current : (current + delta + items.length) % items.length,
          )
        }
      />
    </section>
  );
}
