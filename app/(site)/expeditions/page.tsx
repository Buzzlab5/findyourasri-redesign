import type { Metadata } from 'next';
import Link from 'next/link';

import { Arrow } from '@/components/Arrow';
import Breadcrumbs from '@/components/Breadcrumbs';
import CtaLine from '@/components/CtaLine';
import JsonLd from '@/components/JsonLd';
import { cover, delivered, itineraries, type Itinerary, type Pic } from '@/lib/expeditions';
import { orgId, pageMetadata, pages, site } from '@/lib/site';

import './expeditions.css';

export const metadata: Metadata = pageMetadata(pages.expeditions);

/**
 * Expeditions: the cover, the trip that has run (San Marzano in Komodo),
 * then the itineraries, each with its route laid out day by day as the
 * decks' journey page does. Pictures first, one line each.
 */
export default function ExpeditionsPage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: pages.expeditions.title,
          url: `${site.url}/expeditions/`,
          isPartOf: { '@id': `${site.url}/#website` },
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: itineraries.map((it, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              item: {
                '@type': 'TouristTrip',
                name: `${it.title}, ${it.place}`,
                description: it.body,
                provider: { '@id': orgId },
              },
            })),
          },
        }}
      />

      {/* ---------- the cover ---------- */}
      <section className="svc-cover" aria-labelledby="exp-title">
        <div className="svc-cover__frame">
          <div className="svc-cover__media parallax-media">
            <img
              src={cover.src}
              alt={cover.alt}
              width={cover.w}
              height={cover.h}
              fetchPriority="high"
              style={cover.pos ? { objectPosition: cover.pos } : undefined}
            />
          </div>
          <div className="svc-cover__scrim" aria-hidden="true" />
          <Breadcrumbs light items={[{ href: '/expeditions/', label: 'Expeditions' }]} />
          <div className="svc-cover__body">
            <p className="kick kick--rule reveal">Expeditions</p>
            <h1 id="exp-title" className="svc-cover__title">
              <span className="exp-cover__line">From the Sea.</span>{' '}
              <span className="exp-cover__line">
                To the <em>Mountains.</em>
              </span>
            </h1>
            <p className="svc-cover__lede reveal">
              Trips for a brand and its guests, planned, hosted, filmed and
              photographed by one team.
            </p>
            <p className="svc-cover__actions reveal">
              <Link
                href="/contact/"
                className="pill pill--light magnetic"
                data-track="cta_click"
                data-cta-location="expeditions_cover"
              >
                Start a conversation
                <span className="pill__arrow" aria-hidden="true">
                  <Arrow />
                </span>
              </Link>
              <a href="#itineraries" className="pill pill--ghost magnetic">
                See the itineraries
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* ---------- the trip that has run ---------- */}
      <section className="section">
        <div className="chapter">
          <div className="chapter__visual">
            <div className="collage2">
              <figure className="collage2__main clip-reveal">
                <div className="parallax-media">
                  <Img pic={delivered.main} />
                </div>
              </figure>
              <figure className="collage2__inset clip-reveal">
                <Img pic={delivered.inset} />
              </figure>
            </div>
          </div>
          <div className="chapter__body">
            <span
              className="exp-logo reveal"
              role="img"
              aria-label="San Marzano"
              style={{
                width: delivered.logo.w,
                height: delivered.logo.h,
                WebkitMaskImage: `url(${delivered.logo.src})`,
                maskImage: `url(${delivered.logo.src})`,
              }}
            />
            <p className="kick reveal">{delivered.place}</p>
            <h2 className="chapter__title line-mask">{delivered.title}</h2>
            <p className="text reveal">{delivered.body}</p>
            <p className="chapter__foot reveal">
              <span className="chapter__terms">{delivered.terms}</span>
              <Link
                href={delivered.href}
                className="chapter__link"
                data-track="cta_click"
                data-cta-location="expeditions_delivered"
              >
                See the work
                <span aria-hidden="true"> &#8599;</span>
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ---------- the itineraries ---------- */}
      <section id="itineraries" className="section section--anchor tone-cream">
        <div className="stack stack--head stack--head-center">
          <p className="kick kick--rule reveal">Itineraries</p>
          <h2 className="sec-title line-mask">Where Next</h2>
          <p className="text reveal">
            Each one a starting point. Tell us the season and the size of the
            group, and we will shape the days around you.
          </p>
        </div>

        <ol className="chapters exp-list">
          {itineraries.map((it, i) => (
            <li key={it.slug} className="exp">
              <ItineraryView it={it} n={i + 1} flip={i % 2 === 1} />
            </li>
          ))}
        </ol>
      </section>

      <CtaLine location="expeditions" line="Take your brand somewhere new." />
    </>
  );
}

function ItineraryView({ it, n, flip }: { it: Itinerary; n: number; flip: boolean }) {
  const [tall, top, bottom] = it.pics;
  return (
    <>
      <div className={`chapter${flip ? ' chapter--flip' : ''}`}>
        <div className="chapter__visual">
          <div className="exp-trio">
            <figure className="exp-trio__tall clip-reveal">
              <div className="parallax-media">
                <Img pic={tall} />
              </div>
            </figure>
            <figure className="exp-trio__a clip-reveal">
              <Img pic={top} />
            </figure>
            <figure className="exp-trio__b clip-reveal">
              <Img pic={bottom} />
            </figure>
          </div>
          {it.credit ? <p className="exp-credit reveal">{it.credit}</p> : null}
        </div>
        <div className="chapter__body">
          <p className="chapter__n reveal" aria-hidden="true">
            {String(n).padStart(2, '0')}
          </p>
          <p className="kick reveal">{it.place}</p>
          <h3 className="chapter__title line-mask">{it.title}</h3>
          <p className="exp-line reveal">{it.line}</p>
          <p className="text reveal">{it.body}</p>
          <p className="chapter__foot reveal">
            <span className="chapter__terms">{it.route}</span>
            <Link
              href="/contact/"
              className="chapter__link"
              data-track="cta_click"
              data-cta-location={`expeditions_${it.slug}`}
            >
              Ask for the itinerary
              <span aria-hidden="true"> &#8599;</span>
            </Link>
          </p>
        </div>
      </div>

      <ol className="exp-route" aria-label={`${it.title}, day by day`}>
        {it.days.map((d, i) => (
          <li key={d.title} className="exp-route__day reveal">
            <span className="exp-route__dot" aria-hidden="true" />
            <span className="exp-route__n">Day {String(i + 1).padStart(2, '0')}</span>
            <span className="exp-route__title">{d.title}</span>
            <span className="exp-route__night">{d.overnight}</span>
          </li>
        ))}
      </ol>
    </>
  );
}

function Img({ pic }: { pic: Pic }) {
  return (
    <img
      src={pic.src}
      alt={pic.alt}
      width={pic.w}
      height={pic.h}
      loading="lazy"
      decoding="async"
      style={pic.pos ? { objectPosition: pic.pos } : undefined}
    />
  );
}
