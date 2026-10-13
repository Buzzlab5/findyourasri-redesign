import Link from 'next/link';
import { Arrow } from '@/components/Arrow';

/**
 * Shared component D: one sentence and the pill on a rule, at the end of every
 * page except the home page, which is short enough without it.
 */
export default function CtaLine({
  location,
  line = 'The first step is a day on site.',
  label = 'Start a conversation',
  href = '/contact/',
  lineHref,
}: {
  location: string;
  line?: string;
  label?: string;
  href?: string;
  /** Makes the sentence itself a link, as the case study's "Next" line is. */
  lineHref?: string;
}) {
  return (
    <section className="section">
      <div className="cta-line">
        <p className="text text--b reveal">
          {lineHref ? (
            <Link href={lineHref} className="cta-line__link">
              {line}
            </Link>
          ) : (
            line
          )}
        </p>
        <Link
          href={href}
          className="pill pill--ink magnetic reveal"
          data-track="cta_click"
          data-cta-location={location}
        >
          {label}
          <span className="pill__arrow" aria-hidden="true">
            <Arrow />
          </span>
        </Link>
      </div>
    </section>
  );
}
