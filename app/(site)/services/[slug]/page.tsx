import type { Metadata } from 'next';
import Link from 'next/link';

import Breadcrumbs from '@/components/Breadcrumbs';
import ContactModule from '@/components/ContactModule';
import JsonLd from '@/components/JsonLd';
import SplitHero from '@/components/SplitHero';
import Stages from '@/components/Stages';
import {
  campaignPart,
  frames,
  getService,
  howWeShoot,
  liveServices,
  ON_APPLICATION,
  price,
  sectorsFor,
  type Frame,
  type ServiceSlug,
} from '@/lib/content';
import { orgId, pageMetadata, servicePages, site } from '@/lib/site';
import { Arrow } from '@/components/Arrow';

type Props = { params: Promise<{ slug: ServiceSlug }> };

export const dynamicParams = false;

/** Only live services get a route; Creator Campaigns waits on W2. */
export function generateStaticParams() {
  return liveServices.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return pageMetadata({ path: `/services/${slug}/`, ...servicePages[slug] });
}

/** Bold the partnership names inside the "Part of a partnership" line. */
function withNames(line: string) {
  return line.split(/(Growth|Performance)/).map((part, i) =>
    part === 'Growth' || part === 'Performance' ? <b key={i}>{part}</b> : part,
  );
}

/**
 * One service in full: what is delivered, where it sits in the chain, which
 * partnership includes it and who it is for, then the enquiry. The hero's
 * frame is the service's first picture on /services/ (lib/content.ts,
 * `campaign`), so the two pages show the same campaign. Questions
 * (FAQPage) wait for Phase 2 and the SEO desk's drafts.
 */
export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const service = getService(slug);
  const forWhom = sectorsFor(slug);
  const lead = campaignPart(slug)?.frames[0];
  const frame = lead ? (frames[lead] as Frame) : undefined;

  return (
    <>
      <Breadcrumbs
        items={[
          { href: '/services/', label: 'Services' },
          { href: `/services/${slug}/`, label: service.name },
        ]}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: service.name,
          description: service.body,
          url: `${site.url}/services/${slug}/`,
          provider: { '@id': orgId },
          areaServed: 'Worldwide',
        }}
      />

      <SplitHero
        title={service.title}
        frame={frame}
        cta={{ href: `/contact/?service=${slug}`, location: 'service_page' }}
      >
        <p className="text reveal">{service.body}</p>
        <p className="terms reveal">
          <span>{service.heroTerms ?? service.terms}</span>
          <span>{ON_APPLICATION}</span>
        </p>
      </SplitHero>

      <section className="section">
        <div className="split split--top">
          <h2 className="sec-title line-mask">What Is Included</h2>
          <div className="stack">
            <ul className="ticks ticks--lg">
              {service.points.map((point) => (
                <li key={point} className="reveal">
                  {point}
                </li>
              ))}
            </ul>
            {service.units ? (
              <ul className="mlist">
                {service.units.map((u) => (
                  <li key={u.label} className="mlist__row reveal">
                    <span>{u.label}</span>
                    <span>{price(u.price)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </section>

      {slug === 'production' ? (
        <section className="section">
          <div className="production">
            <div className="reveal">
              <p className="production__title">{howWeShoot.title}</p>
            </div>
            {howWeShoot.lines.map((line) => (
              <p key={line} className="production__body reveal">
                {line}
              </p>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section">
        <h2 className="sec-title sec-title--gap line-mask">Where It Sits</h2>
        <Stages lit={service.stages} />
      </section>

      <section className="section">
        <div className="blk reveal">
          <p className="blk__title">Part of a partnership</p>
          <p className="text">{withNames(service.inPartnership)}</p>
          <p>
            <Link href="/services/#partnerships" className="pill pill--outline magnetic">
              Compare partnerships
              <span className="pill__arrow" aria-hidden="true">
                <Arrow />
              </span>
            </Link>
          </p>
        </div>
      </section>

      {forWhom.length ? (
        <section className="section">
          <h2 className="sec-title sec-title--gap line-mask">Who It Is For</h2>
          <ul className="chips">
            {forWhom.map((s) => (
              <li key={s.slug} className="reveal">
                <Link href={`/sectors/${s.slug}/`} className="chip">
                  {s.name} <Arrow dir="right" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {service.faqs?.length ? (
        <section className="section">
          <JsonLd
            data={{
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: service.faqs.map((f) => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a },
              })),
            }}
          />
          <h2 className="sec-title sec-title--gap line-mask">Questions</h2>
          <div className="qa">
            {service.faqs.map((f) => (
              <details key={f.q} className="qa__item reveal">
                <summary>
                  {f.q}
                  <span aria-hidden="true">+</span>
                </summary>
                <p className="text">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      <ContactModule title="Tell Us What Needs to Move" service={slug} />
    </>
  );
}
