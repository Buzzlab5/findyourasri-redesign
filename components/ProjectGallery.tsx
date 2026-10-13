'use client';

import Link from 'next/link';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';

import Contours, { type PatternName } from '@/components/Contours';
import Lightbox from '@/components/Lightbox';
import { ScrollTrigger, gsap, initGsap, motionIsOff } from '@/lib/gsap';
import type { ProjectImage, ProjectMedia } from '@/lib/projects';
import { Arrow, Play } from '@/components/Arrow';

type Still = Extract<ProjectMedia, { type: 'image' }>;

type Next = {
  href: string;
  title: string;
  tile: { src: string; w: number; h: number };
  cover: ProjectImage;
};

/** Height is the rail's; width follows from the picture's shape (`--w`). */
const fit = (m: { w: number; h: number }) =>
  ({
    aspectRatio: `${m.w} / ${m.h}`,
    '--w': `calc(var(--hs-h) * ${m.w} / ${m.h})`,
  }) as React.CSSProperties;

/** Turns @handles in a story into links to their Instagram profiles. */
function withHandles(text: string) {
  return text.split(/(@[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*)/g).map((part, i) =>
    part.startsWith('@') ? (
      <a
        key={i}
        href={`https://www.instagram.com/${part.slice(1)}/`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {part}
      </a>
    ) : (
      part
    ),
  );
}

type Panel =
  | { kind: 'story'; text: string }
  | { kind: 'media'; media: ProjectMedia; image: number }
  | { kind: 'next' };

/**
 * The project's story and pictures on one rail. On a desktop the section pins
 * to the screen and the page's own scroll (wheel or trackpad) moves the rail
 * sideways; on a phone, or with reduced motion, it is a plain swipeable row.
 * The story's paragraphs are set between the pictures rather than above them,
 * so reading and looking stay in one motion.
 */
export default function ProjectGallery({
  title,
  story,
  gallery,
  next,
  pattern,
}: {
  title: string;
  story: string[];
  gallery: ProjectMedia[];
  next?: Next;
  /** The chart motif drawn faintly behind the rail. */
  pattern: PatternName;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const decoRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  const [lightbox, setLightbox] = useState<number | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  const stills = useMemo(() => gallery.filter((m): m is Still => m.type === 'image'), [gallery]);

  // Paragraph i lands before the picture that is i/n of the way along.
  const panels = useMemo(() => {
    const list: Panel[] = [];
    let image = 0;
    gallery.forEach((media, i) => {
      story.forEach((text, s) => {
        if (Math.floor((s * gallery.length) / story.length) === i) list.push({ kind: 'story', text });
      });
      list.push({ kind: 'media', media, image: media.type === 'image' ? image++ : -1 });
    });
    if (next) list.push({ kind: 'next' });
    return list;
  }, [gallery, story, next]);

  /* ---------- phones and reduced motion: the rail is a swipeable row ---------- */
  useEffect(() => {
    const root = rootRef.current;
    const viewport = viewportRef.current;
    const bar = barRef.current;
    const count = countRef.current;
    if (!root || !viewport || !bar || !count) return;

    const update = () => {
      // Pinned, the page scroll drives the bar instead.
      if (root.classList.contains('is-pinned')) return;
      const max = viewport.scrollWidth - viewport.clientWidth;
      if (max <= 0) return;
      const progress = Math.min(1, Math.max(0, viewport.scrollLeft / max));
      bar.style.setProperty('--p', String(progress));
      const n = Math.min(gallery.length, Math.floor(progress * gallery.length) + 1);
      count.textContent = String(n).padStart(2, '0');
    };

    viewport.addEventListener('scroll', update, { passive: true });
    return () => viewport.removeEventListener('scroll', update);
  }, [gallery.length]);

  /* ---------- desktop: pin, and let the page scroll drive the rail ---------- */
  useEffect(() => {
    if (motionIsOff()) return;
    initGsap();

    const root = rootRef.current;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const bar = barRef.current;
    const count = countRef.current;
    const deco = decoRef.current;
    if (!root || !viewport || !track || !bar || !count || !deco) return;

    const mm = gsap.matchMedia();
    mm.add('(min-width: 861px)', () => {
      const header = document.querySelector<HTMLElement>('.header');
      const top = () => header?.offsetHeight ?? 84;
      const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);

      root.style.setProperty('--hs-top', `${top()}px`);
      root.classList.add('is-pinned');

      // The chart lines drift against the rail at a third of its speed, so the
      // empty ground behind the pictures has some depth.
      const slide = gsap.timeline({ defaults: { ease: 'none' } });
      slide.to(track, { x: () => -distance() }, 0).to(deco, { x: () => distance() * 0.3 }, 0);
      const trigger = ScrollTrigger.create({
        trigger: root,
        start: () => `top top+=${top()}`,
        end: () => `+=${distance()}`,
        pin: true,
        anticipatePin: 1,
        scrub: 0.6,
        animation: slide,
        invalidateOnRefresh: true,
        // The pin adds height to the page, so it has to be measured before the
        // triggers below it (the footer's reveals) are.
        refreshPriority: 1,
        onRefreshInit: () => root.style.setProperty('--hs-top', `${top()}px`),
        onUpdate: (self) => {
          bar.style.setProperty('--p', String(self.progress));
          const n = Math.min(gallery.length, Math.floor(self.progress * gallery.length) + 1);
          count.textContent = String(n).padStart(2, '0');
        },
      });

      // Tabbing to something off screen would make the browser scroll the
      // clipped viewport itself. Scroll the page to the same place instead.
      const onFocus = (event: FocusEvent) => {
        viewport.scrollLeft = 0;
        const panel = (event.target as HTMLElement).closest<HTMLElement>('.hs__panel');
        if (!panel || !distance()) return;
        const share = Math.min(1, Math.max(0, (panel.offsetLeft - 40) / distance()));
        window.scrollTo({ top: trigger.start + share * (trigger.end - trigger.start) });
      };
      viewport.addEventListener('focusin', onFocus);

      return () => {
        viewport.removeEventListener('focusin', onFocus);
        trigger.kill();
        slide.kill();
        gsap.set([track, deco], { clearProps: 'transform' });
        bar.style.removeProperty('--p');
        count.textContent = '01';
        root.classList.remove('is-pinned');
      };
    });

    return () => mm.revert();
  }, [panels, gallery.length]);

  return (
    <section ref={rootRef} className="hs" aria-label={`${title}: story and gallery`}>
      <div className="hs__viewport" ref={viewportRef}>
        <div className="hs__track" ref={trackRef}>
          <div className="hs__deco" ref={decoRef} aria-hidden="true">
            <Contours name={pattern} />
          </div>
          {panels.map((panel, i) => (
            <Fragment key={i}>
              {panel.kind === 'story' ? (
                <div className="hs__panel hs__panel--story">
                  <p className={`hs__story${panel.text.length > 220 ? ' hs__story--long' : ''}`}>{withHandles(panel.text)}</p>
                </div>
              ) : null}

              {panel.kind === 'media' && panel.media.type === 'image' ? (
                <div className="hs__panel">
                  <button
                    type="button"
                    className="hs__still"
                    aria-label={`Open picture ${panel.image + 1} of ${stills.length}`}
                    style={fit(panel.media)}
                    onClick={(event) => {
                      openerRef.current = event.currentTarget;
                      setLightbox(panel.image);
                    }}
                  >
                    <img
                      src={panel.media.src}
                      alt={panel.media.alt}
                      width={panel.media.w}
                      height={panel.media.h}
                      loading={i < 3 ? 'eager' : 'lazy'}
                      draggable={false}
                    />
                  </button>
                </div>
              ) : null}

              {panel.kind === 'media' && panel.media.type === 'video' ? (
                <div className="hs__panel">
                  <figure className="hs__film" style={fit(panel.media)}>
                    {playing === panel.media.src ? (
                      <video poster={panel.media.poster} controls autoPlay playsInline preload="none">
                        {panel.media.srcSm ? (
                          <source src={panel.media.srcSm} type="video/mp4" media="(max-width: 860px)" />
                        ) : null}
                        <source src={panel.media.src} type="video/mp4" />
                      </video>
                    ) : (
                      <button
                        type="button"
                        className="reel-frame__play"
                        aria-label={`Play ${panel.media.title}`}
                        data-track="cta_click"
                        data-cta-location="project_film"
                        onClick={() => setPlaying(panel.media.type === 'video' ? panel.media.src : null)}
                      >
                        <img src={panel.media.poster} alt={panel.media.alt} loading="lazy" draggable={false} />
                        <span className="reel-frame__button" aria-hidden="true">
                          <Play />
                        </span>
                      </button>
                    )}
                    <figcaption className="hs__film-title">{panel.media.title}</figcaption>
                  </figure>
                </div>
              ) : null}

              {panel.kind === 'next' && next ? (
                <div className="hs__panel">
                  <Link href={next.href} className="work-tile hs__next" aria-label={`Next project: ${next.title}`}>
                    <img
                      src={next.tile.src}
                      alt=""
                      width={next.tile.w}
                      height={next.tile.h}
                      loading="lazy"
                      style={next.cover.pos ? { objectPosition: next.cover.pos } : undefined}
                    />
                    <span className="work-tile__scrim" aria-hidden="true" />
                    <span className="work-tile__text">
                      <span className="work-tile__title">{next.title}</span>
                      <span className="work-tile__meta">Next project</span>
                    </span>
                    <span className="hs__round" aria-hidden="true">
                      <Arrow />
                    </span>
                  </Link>
                </div>
              ) : null}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="hs__bar" ref={barRef} aria-hidden="true">
        <span className="hs__count">
          <b ref={countRef}>01</b> / {String(gallery.length).padStart(2, '0')}
        </span>
        <span className="hs__line">
          <span className="hs__fill" />
          <span className="hs__thumb" />
        </span>
        <span className="hs__swipe">Swipe</span>
      </div>

      <Lightbox
        items={stills.map((m) => ({ ...m, title }))}
        index={lightbox}
        restoreFocusTo={openerRef}
        onClose={() => setLightbox(null)}
        onStep={(delta) =>
          setLightbox((current) =>
            current === null ? current : (current + delta + stills.length) % stills.length,
          )
        }
      />
    </section>
  );
}
