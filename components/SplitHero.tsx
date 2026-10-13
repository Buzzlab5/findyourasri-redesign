import Link from 'next/link';
import type { ReactNode } from 'react';

import Contours, { type PatternName } from '@/components/Contours';
import type { Frame } from '@/lib/content';
import { Arrow } from '@/components/Arrow';

/**
 * The hero for sector, service and hidden pages: the H1, copy and the
 * button on the left, the frame on the right, centred against each other.
 * Without a frame the copy runs the full width. A `pattern` lays the page's
 * own chart lines behind the copy's column, filling the space above and
 * below the words.
 */
export default function SplitHero({
  title,
  children,
  cta,
  frame,
  ratio = '4 / 5',
  pattern,
}: {
  title: string;
  children?: ReactNode;
  cta: { href: string; location: string; label?: string; smooth?: ReactNode };
  frame?: Frame;
  ratio?: string;
  pattern?: PatternName;
}) {
  return (
    <section className="split-hero">
      {pattern ? <Contours name={pattern} /> : null}
      <div className="split-hero__body">
        <h1 className="split-hero__title line-mask">{title}</h1>
        <div className="split-hero__copy">{children}</div>
        <p className="split-hero__cta reveal">
          {cta.smooth ?? (
            <Link
              href={cta.href}
              className="pill pill--ink magnetic"
              data-track="cta_click"
              data-cta-location={cta.location}
            >
              {cta.label ?? 'Start a conversation'}
              <span className="pill__arrow" aria-hidden="true">
                <Arrow />
              </span>
            </Link>
          )}
        </p>
      </div>
      {frame ? (
        <div className="split-hero__media clip-reveal" style={{ aspectRatio: ratio }}>
          <img
            src={frame.src}
            alt={frame.alt}
            width={frame.w}
            height={frame.h}
            fetchPriority="high"
            style={frame.pos ? { objectPosition: frame.pos } : undefined}
          />
        </div>
      ) : null}
    </section>
  );
}
