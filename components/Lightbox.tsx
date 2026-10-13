'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { EASE, gsap, initGsap, motionIsOff } from '@/lib/gsap';
import { Arrow } from '@/components/Arrow';

export type LightboxItem = {
  readonly title: string;
  readonly caption?: string;
  readonly src: string;
  readonly alt: string;
  readonly w: number;
  readonly h: number;
};

/**
 * The full-frame viewer, shared by the homepage rail and the work index.
 *
 * It is a portal on <body>: it must not inherit a grid's `overflow: hidden`,
 * and it has to sit above the sticky header. The parent owns `index`; this
 * owns the exit animation, so it stays mounted until the tween finishes.
 */
export default function Lightbox({
  items,
  index,
  onStep,
  onClose,
  restoreFocusTo,
}: {
  items: readonly LightboxItem[];
  index: number | null;
  onStep: (delta: number) => void;
  onClose: () => void;
  restoreFocusTo?: React.RefObject<HTMLElement | null>;
}) {
  const [closing, setClosing] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const directionRef = useRef(1);

  const isOpen = index !== null;
  const item = index === null ? null : items[index];

  const close = useCallback(() => {
    if (motionIsOff()) {
      onClose();
      return;
    }
    setClosing(true);
    initGsap();
    gsap.to(rootRef.current, {
      opacity: 0,
      duration: 0.28,
      ease: EASE,
      onComplete: () => {
        setClosing(false);
        onClose();
      },
    });
  }, [onClose]);

  const step = useCallback(
    (delta: number) => {
      directionRef.current = delta;
      onStep(delta);
    },
    [onStep],
  );

  /* ---------- while open: keys, scroll lock, focus ---------- */
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      } else if (event.key === 'ArrowRight') {
        step(1);
      } else if (event.key === 'ArrowLeft') {
        step(-1);
      } else if (event.key === 'Tab') {
        const focusable = rootRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled)');
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    // Locking the body would collapse the scrollbar and shift the page under
    // the viewer, so its width is given back as padding.
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    const previous = {
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight,
    };
    document.body.style.overflow = 'hidden';
    if (gutter > 0) document.body.style.paddingRight = `${gutter}px`;

    document.addEventListener('keydown', onKey);
    const opener = restoreFocusTo?.current;
    closeRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous.overflow;
      document.body.style.paddingRight = previous.paddingRight;
      opener?.focus({ preventScroll: true });
    };
  }, [isOpen, close, step, restoreFocusTo]);

  /* ---------- entrance ---------- */
  useEffect(() => {
    if (!isOpen || motionIsOff()) return;
    initGsap();

    const ctx = gsap.context(() => {
      gsap.fromTo('.lb__scrim', { opacity: 0 }, { opacity: 1, duration: 0.35, ease: EASE });
      gsap.fromTo(
        '.lb__bar, .lb__foot',
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.5, ease: EASE, delay: 0.1 },
      );
    }, rootRef);

    return () => ctx.revert();
    // Plays once per opening, not again on every step through the frames.
  }, [isOpen]);

  /* ---------- each frame, including the first ---------- */
  useEffect(() => {
    if (index === null || motionIsOff()) return;
    const el = imageRef.current;
    if (!el) return;

    initGsap();
    const tween = gsap.fromTo(
      el,
      { opacity: 0, x: directionRef.current * 26, scale: 0.985 },
      { opacity: 1, x: 0, scale: 1, duration: 0.5, ease: EASE },
    );
    return () => {
      tween.kill();
    };
  }, [index]);

  /* ---------- keep the neighbours warm ---------- */
  useEffect(() => {
    if (index === null) return;
    [1, -1].forEach((delta) => {
      const preload = new window.Image();
      preload.src = items[(index + delta + items.length) % items.length].src;
    });
  }, [index, items]);

  /* ---------- swipe ---------- */
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (event: React.PointerEvent) => {
    swipeRef.current = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: React.PointerEvent) => {
    const start = swipeRef.current;
    swipeRef.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    if (Math.abs(dx) < 48 || Math.abs(event.clientY - start.y) > Math.abs(dx)) return;
    step(dx < 0 ? 1 : -1);
  };

  if ((!isOpen && !closing) || !item) return null;

  return createPortal(
    <div className="lb" ref={rootRef} role="dialog" aria-modal="true" aria-label="Project viewer">
      <button className="lb__scrim" type="button" aria-label="Close viewer" onClick={close} />

      <div className="lb__bar">
        <p className="lb__count">
          {String((index ?? 0) + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
        </p>
        <button
          type="button"
          className="lb__btn"
          ref={closeRef}
          onClick={close}
          aria-label="Close viewer"
        >
          <span aria-hidden="true">&#10005;</span>
        </button>
      </div>

      <div className="lb__stage" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        <figure className="lb__figure">
          <img
            ref={imageRef}
            src={item.src}
            alt={item.alt}
            width={item.w}
            height={item.h}
            draggable={false}
          />
        </figure>
      </div>

      <div className="lb__foot">
        <div className="lb__caption">
          <p className="lb__client">{item.title}</p>
          {item.caption ? <p className="lb__services">{item.caption}</p> : null}
        </div>
        <div className="lb__nav">
          <button
            type="button"
            className="lb__btn"
            onClick={() => step(-1)}
            aria-label="Previous project"
          >
            <span aria-hidden="true">&#8592;</span>
          </button>
          <button
            type="button"
            className="lb__btn"
            onClick={() => step(1)}
            aria-label="Next project"
          >
            <span aria-hidden="true"><Arrow dir="right" /></span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
