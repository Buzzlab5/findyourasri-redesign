'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';

import { EASE, EASE_LONG, gsap, initGsap, motionIsOff } from '@/lib/gsap';
import { menuLinks, navLinks } from '@/lib/content';
import { followLink } from '@/components/NavGuard';
import { isActivePath } from '@/lib/nav';
import { mailto, phoneLink, site } from '@/lib/site';
import { Arrow } from '@/components/Arrow';

/**
 * The menu button at the top right, and the sheet it opens.
 *
 * Phones: a full-height sheet with every page, the bar's links first.
 * Desktop: the bar keeps its links, so the sheet drops from the top right as
 * a panel holding only `menuLinks` (About and Contact); the bar's rows are
 * hidden there by `.sheet__row--bar`. Rows are numbered by a CSS counter, so
 * the numbers stay in sequence whichever rows show. The sheet is a portal on
 * <body> so it cannot inherit the header's stacking or padding.
 */
type Row = (typeof navLinks)[number] & { bar: boolean };

/** Every row the phone sheet shows; `bar` marks the ones desktop keeps in the bar. */
const rows: Row[] = [
  ...navLinks.map((link) => ({ ...link, bar: true })),
  ...menuLinks.map((link) => ({ ...link, bar: false })),
];

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  // The Work row's own dropdown inside the sheet.
  const [subOpen, setSubOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const sheetRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  /**
   * What to do once the sheet is really gone. It is run by the open effect's
   * cleanup rather than straight after `setOpen(false)`, because that state
   * update is what releases `body { overflow: hidden }` — and it releases it a
   * commit later. A scroll started before that lands on a locked document and
   * gets clamped back to 0, which is exactly the nav "not working".
   */
  const pending = useRef<(() => void) | null>(null);

  const close = useCallback(() => {
    if (motionIsOff() || !timeline.current) {
      setOpen(false);
      return;
    }
    timeline.current.timeScale(1.7).reverse();
    timeline.current.eventCallback('onReverseComplete', () => setOpen(false));
  }, []);

  /* ---------- open: keys, scroll lock, focus ---------- */
  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    const gutter = window.innerWidth - document.documentElement.clientWidth;
    const previous = {
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight,
    };
    document.body.style.overflow = 'hidden';
    if (gutter > 0) document.body.style.paddingRight = `${gutter}px`;
    document.addEventListener('keydown', onKey);
    const button = buttonRef.current;

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous.overflow;
      document.body.style.paddingRight = previous.paddingRight;
      // preventScroll: returning focus must not fight the jump below.
      button?.focus({ preventScroll: true });

      const run = pending.current;
      pending.current = null;
      run?.();
    };
  }, [open, close]);

  /* ---------- the sheet itself ---------- */
  useEffect(() => {
    if (!open || motionIsOff()) return;
    initGsap();

    const ctx = gsap.context(() => {
      // Wipes down from the header, then the rows arrive out of their masks —
      // the same language as the hero frame and the headlines.
      const tl = gsap.timeline({ defaults: { ease: EASE_LONG } });
      tl.fromTo(
        '.sheet__panel',
        { clipPath: 'inset(0% 0% 100% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.55 },
      )
        .fromTo(
          '.sheet__row span',
          { yPercent: 115 },
          { yPercent: 0, duration: 0.65, stagger: 0.055 },
          0.18,
        )
        .fromTo(
          '.sheet__foot > *',
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: EASE },
          0.34,
        );
      timeline.current = tl;
    }, sheetRef);

    return () => {
      timeline.current = null;
      ctx.revert();
    };
  }, [open]);

  const go = (href: string) => {
    // Still deferred to the close: navigating while the sheet is mid-exit
    // leaves the body scroll-locked on the page that arrives.
    pending.current = () => {
      followLink(href);
      router.push(href);
    };
    close();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`burger${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => {
          if (open) return close();
          // Opens expanded when you are already somewhere inside Work.
          setSubOpen(navLinks.some((l) => l.children?.some((c) => isActivePath(pathname, c.href))));
          setOpen(true);
        }}
      >
        <span className="burger__bar" />
        <span className="burger__bar" />
      </button>

      {open &&
        createPortal(
          <div
            className="sheet"
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            // Desktop: a click on the dimmed page around the panel closes it.
            onClick={(event) => {
              if (event.target === event.currentTarget) close();
            }}
          >
            <div className="sheet__panel">
              <nav className="sheet__nav" aria-label="Primary">
                {rows.map((link) => {
                  const current = isActivePath(pathname, link.href);
                  const bar = link.bar ? ' sheet__row--bar' : '';
                  return (
                    <Fragment key={link.href}>
                      {'children' in link && link.children ? (
                        // A menu, not a page: the row opens its categories
                        // and only they navigate.
                        <button
                          type="button"
                          className={`sheet__row sheet__row--menu${bar}${current ? ' is-current' : ''}${subOpen ? ' is-open' : ''}`}
                          aria-expanded={subOpen}
                          aria-controls="sheet-sub-work"
                          onClick={() => setSubOpen((v) => !v)}
                        >
                          <span>
                            <i aria-hidden="true" />
                            {link.label}
                            <svg className="sheet__chev" viewBox="0 0 10 6" width="16" height="10" aria-hidden="true">
                              <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={`sheet__row${bar}${current ? ' is-current' : ''}`}
                          aria-current={current ? 'page' : undefined}
                          onClick={() => go(link.href)}
                        >
                          <span>
                            <i aria-hidden="true" />
                            {link.label}
                          </span>
                        </button>
                      )}
                      {'children' in link && link.children ? (
                        <div
                          id="sheet-sub-work"
                          className={`sheet__sub${bar}${subOpen ? ' is-open' : ''}`}
                          aria-hidden={!subOpen}
                        >
                          <div className="sheet__sub-inner">
                            {link.children.map((child) => (
                              <button
                                key={child.href}
                                type="button"
                                tabIndex={subOpen ? undefined : -1}
                                className={isActivePath(pathname, child.href) ? 'is-here' : undefined}
                                onClick={() => go(child.href)}
                              >
                                {child.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </Fragment>
                  );
                })}
              </nav>

              <div className="sheet__foot" data-link-location="menu">
                <a href={mailto} className="sheet__email">
                  {site.email}
                </a>
                <a href={phoneLink} className="sheet__phone" data-phone-country={site.phoneCountry}>
                  {site.whatsapp ? `WhatsApp ${site.phone}` : site.phone}
                </a>
                <button
                  type="button"
                  className="pill pill--ink"
                  onClick={() => go('/contact/')}
                  data-track="cta_click"
                  data-cta-location="menu"
                >
                  Start a conversation
                  <span className="pill__arrow" aria-hidden="true">
                    <Arrow />
                  </span>
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
