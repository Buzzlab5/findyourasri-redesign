import type { Metadata } from 'next';
import Link from 'next/link';

import ContactModule from '@/components/ContactModule';
import FrameGrid from '@/components/FrameGrid';
import Hero from '@/components/Hero';
import JsonLd from '@/components/JsonLd';
import PageHead from '@/components/PageHead';
import BrandReel from '@/components/BrandReel';
import SectorTiles from '@/components/SectorTiles';
import { featured, frames } from '@/lib/content';
import { homeGraph, pageMetadata, pages } from '@/lib/site';
import { Arrow } from '@/components/Arrow';

const SHOW_CAMPAIGNS = false;

export const metadata: Metadata = pageMetadata(pages.home);

/**
 * One job: say what Asri is and who it serves, then send each visitor to
 * their sector or the form. Five sections between the header and the footer;
 * everything else lives on the page it belongs to. With the page this short,
 * the form is a short scroll from the hero, so there are no CTA lines.
 */
export default function Home() {
  return (
    <>
      <JsonLd data={homeGraph} />
      <Hero />
      <BrandReel />
      <SectorTiles />

      {/* Selected Campaigns: off until real campaigns replace the archive frames
          (Anthony, 28 Sep: no placeholder content on the live site). */}
      {SHOW_CAMPAIGNS ? (
      <section className="section" data-section-view="work">
        <PageHead
          heading="h2"
          title="Selected Campaigns"
          aside={
            <p className="head2__action reveal">
              <Link href="/work/" className="pill pill--outline magnetic">
                See the work
                <span className="pill__arrow" aria-hidden="true">
                  <Arrow />
                </span>
              </Link>
            </p>
          }
        />
        <FrameGrid items={featured.map((id) => frames[id])} slide />
      </section>
      ) : null}

      <ContactModule
        variant="full"
        title="Start With a Day on Site"
        lede="We spend a day with your team, then come back with a plan and a number."
      />
    </>
  );
}
