'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment, useEffect, useRef } from 'react';

import MobileMenu from '@/components/MobileMenu';
import NavMenu from '@/components/NavMenu';
import { navLinks } from '@/lib/content';
import { isActivePath } from '@/lib/nav';

/**
 * The one pinned element on the page. Past the first screen it condenses and
 * grows a hairline, so the canvas underneath reads as scrolling past it rather
 * than under a floating slab.
 */
export default function Header() {
  const ref = useRef<HTMLElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        el.classList.toggle('is-stuck', window.scrollY > 24);
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header ref={ref} className="header">
      <div className="header__row">
        <Link href="/" className="header__logo hdr-item" aria-label="Asri, home">
          <img src="/img/asri-white.png" alt="Asri" width={1171} height={320} />
        </Link>

        <nav className="nav" aria-label="Primary">
          {navLinks.map((link, i) => {
            const current = isActivePath(pathname, link.href);
            return (
              <Fragment key={link.href}>
                {i > 0 && (
                  <span className="nav__sep hdr-item" aria-hidden="true">
                    +
                  </span>
                )}
                {link.children ? (
                  <NavMenu label={link.label} items={link.children} />
                ) : (
                  <Link
                    href={link.href}
                    className={`hdr-item${current ? ' is-current' : ''}`}
                    aria-current={current ? 'page' : undefined}
                    /* Feeds .nav a::before, which reserves the current-page
                       width so the row does not shift between pages. */
                    data-label={link.label}
                    data-track="cta_click"
                    data-cta-location="nav"
                  >
                    {link.label}
                  </Link>
                )}
              </Fragment>
            );
          })}
        </nav>

        {/* The menu button sits where "Start a conversation" was (Anthony,
            15 Oct 2026): About and Contact are behind it. */}
        <MobileMenu />
      </div>
    </header>
  );
}
