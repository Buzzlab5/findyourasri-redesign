import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import ContactModule from '@/components/ContactModule';
import FrameGrid from '@/components/FrameGrid';
import Measured from '@/components/Measured';
import ServiceCards from '@/components/ServiceCards';
import SmoothLink from '@/components/SmoothLink';
import SplitHero from '@/components/SplitHero';
import { frames, getSector, hiddenPages, people, type FrameId } from '@/lib/content';
import { site } from '@/lib/site';
import { Arrow } from '@/components/Arrow';

type Props = { params: Promise<{ hidden: string }> };

/** Only the slugs in hiddenPages exist; anything else at the root is a 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return hiddenPages.map((p) => ({ hidden: p.slug }));
}

function getPage(slug: string) {
  return hiddenPages.find((p) => p.slug === slug);
}

/**
 * Hidden from search twice over: noindex here, and an X-Robots-Tag header in
 * netlify.toml. Never listed in robots.txt, which would publish the path and
 * stop crawlers from ever seeing the noindex. The link preview is the first
 * thing the reader sees, so it gets its own title and description.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hidden } = await params;
  const page = getPage(hidden);
  if (!page) return {};
  return {
    title: { absolute: page.og.title },
    description: page.og.description,
    robots: { index: false, follow: false },
    openGraph: {
      siteName: site.name,
      title: page.og.title,
      description: page.og.description,
      type: 'website',
      url: `${site.url}/${page.slug}/`,
      locale: site.locale,
      images: [site.ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: page.og.title,
      description: page.og.description,
      images: [site.ogImage.url],
    },
  };
}

/**
 * One page per vertical, sent by link from a founder's own email or WhatsApp.
 * Nothing on the site links in; this page may link out to the public service
 * pages. Anyone with the link can open it, so nothing goes here that you would
 * not show a stranger.
 */
export default async function HiddenPage({ params }: Props) {
  const { hidden } = await params;
  const page = getPage(hidden);
  if (!page) notFound();

  const sector = getSector(page.sector);
  const team = page.people
    .map((name) => people.find((p) => p.name === name)!)
    .filter((p) => p.show);

  return (
    <>
      <SplitHero
        title={page.title}
        frame={frames[page.frames[0] as FrameId]}
        cta={{
          href: '#start',
          location: 'vertical_page',
          smooth: (
            <SmoothLink
              href="#start"
              className="pill pill--ink magnetic"
              data-track="cta_click"
              data-cta-location="vertical_page"
            >
              Start a conversation
              <span className="pill__arrow" aria-hidden="true">
                <Arrow />
              </span>
            </SmoothLink>
          ),
        }}
      >
        <p className="text reveal">{page.body}</p>
        {page.proof?.verified ? <p className="text text--b reveal">{page.proof.text}</p> : null}
      </SplitHero>

      {team.length ? (
        <section className="section">
          <h2 className="sec-title sec-title--gap line-mask">The People</h2>
          <ul className="people people--3">
            {team.map((p) => (
              <li key={p.name} className="person reveal">
                <p className="person__name">{p.fullName}</p>
                <p className="person__role">{p.role}</p>
                {p.line ? <p className="text">{p.line}</p> : null}
              </li>
            ))}
          </ul>
          {page.peopleNote ? <p className="text text--b people__note reveal">{page.peopleNote}</p> : null}
          {page.credential ? (
            <ul className="chips">
              <li className="chip reveal">{page.credential}</li>
            </ul>
          ) : null}
        </section>
      ) : null}

      <section className="section">
        <div className="split split--top split--gap">
          <div className="stack">
            <h2 className="sec-title line-mask">{page.shoot.title}</h2>
            <p className="text text--b reveal">{page.shoot.lead}</p>
          </div>
          <ul className="ticks ticks--lg">
            {page.shoot.items.map((item) => (
              <li key={item} className="reveal">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <FrameGrid items={page.frames.map((id) => frames[id as FrameId])} caption="none" keep3 />
      </section>

      <section className="section">
        <h2 className="sec-title sec-title--gap line-mask">What We Run for {sector.name}</h2>
        <ServiceCards items={page.services} />
        <p className="text text--b closer reveal">{page.closer}</p>
      </section>

      <Measured items={page.measures} frame={page.measuresFrame ? frames[page.measuresFrame] : undefined} />

      <ContactModule
        variant="start"
        id="start"
        title={page.firstStep.title}
        lede={page.firstStep.body}
        sector={sector.lead}
        vertical={page.vertical}
        lockSector
        emailLabel="Email"
        companyLabel="Company or vessel"
      >
        <p className="text text--b reveal">{page.firstStep.line}</p>
      </ContactModule>
    </>
  );
}
