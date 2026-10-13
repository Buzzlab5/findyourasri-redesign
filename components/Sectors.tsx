import Link from 'next/link';

import { frames, getSector, type FrameId } from '@/lib/content';
import { Arrow } from '@/components/Arrow';

/** The wireframe's order: destinations, hospitality, then brands and operators. */
const order = ['destinations', 'hospitality', 'brands', 'operators'] as const;

/** The /sectors/ rows: four alternating rows, each with its own slow parallax and a link to its page. */
export default function Sectors() {
  return (
    <div className="sectors__list">
      {order.map((slug, i) => {
        const s = getSector(slug);
        const f = frames[s.frame as FrameId];
        return (
          <article key={s.slug} className={`sector${i % 2 ? ' sector--flip' : ''}`}>
            <div className="sector__media clip-reveal">
              <img
                className="parallax-media"
                src={f.src}
                alt={f.alt}
                width={f.w}
                height={f.h}
                loading="lazy"
                style={'pos' in f ? { objectPosition: f.pos } : undefined}
              />
            </div>
            <div className="sector__body">
              <h2 className="sector__title reveal">{s.title}</h2>
              <p className="sector__body-text reveal">{s.body}</p>
              <p className="sector__proof reveal">
                <Link href={`/sectors/${s.slug}/`} className="pill pill--outline magnetic">
                  How we work with {s.name === 'Global brands' ? 'brands' : s.name.toLowerCase()}
                  <span className="pill__arrow" aria-hidden="true">
                    <Arrow />
                  </span>
                </Link>
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
