import type { ReactNode } from 'react';
import { Arrow } from '@/components/Arrow';

/**
 * The header's call to action: a dot with an arrow that opens into the full
 * "Start a conversation" pill on hover or keyboard focus.
 *
 * The label is always in the DOM, so it is read out and found by search; only
 * its width animates. The pill is absolutely positioned inside a fixed 40px
 * slot, so opening it grows leftwards and never nudges the nav sideways.
 */
export default function HeaderCta({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={`cta-dot-slot hdr-item ${className}`.trim()}>{children}</span>;
}

export function HeaderCtaLabel() {
  return (
    <>
      <span className="cta-dot__label">
        <span>Start a conversation</span>
      </span>
      <span className="pill__arrow" aria-hidden="true">
        <Arrow />
      </span>
    </>
  );
}
