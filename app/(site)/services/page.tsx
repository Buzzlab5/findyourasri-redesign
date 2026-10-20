import type { Metadata } from "next";
import Link from "next/link";

import Breadcrumbs from "@/components/Breadcrumbs";
import CampaignChapters from "@/components/CampaignChapters";
import JsonLd from "@/components/JsonLd";
import Process from "@/components/Process";
import { campaign, frames, getService, liveServices, partnerships, price, type Frame } from "@/lib/content";
import { orgId, pageMetadata, pages, site } from "@/lib/site";
import { Arrow } from '@/components/Arrow';

export const metadata: Metadata = pageMetadata(pages.services);

/**
 * How Asri is bought, told as one campaign. The cover; the campaign in five
 * parts, each a service and each led by its pictures; the two partnerships
 * that run the whole campaign; the first ninety days; every service on its
 * own; and a closing band. Pictures first, as the proposals are: each block
 * carries one heading and one line.
 */
export default function ServicesPage() {
  const cover = frames.dGoldenCrossing as Frame;
  const close = frames.svcTeam as Frame;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: pages.services.title,
          url: `${site.url}/services/`,
          isPartOf: { "@id": `${site.url}/#website` },
          mainEntity: {
            "@type": "OfferCatalog",
            name: "Services and partnerships",
            itemListElement: [
              ...partnerships.map((p) => ({
                "@type": "Offer",
                name: `${p.name} partnership`,
                description: p.line,
                offeredBy: { "@id": orgId },
              })),
              ...liveServices.map((s) => ({
                "@type": "Offer",
                itemOffered: {
                  "@type": "Service",
                  name: s.name,
                  url: `${site.url}/services/${s.slug}/`,
                },
                offeredBy: { "@id": orgId },
              })),
            ],
          },
        }}
      />

      {/* ---------- the cover ---------- */}
      <section className="svc-cover" aria-labelledby="svc-title">
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
          <Breadcrumbs light items={[{ href: "/services/", label: "Services" }]} />
          <div className="svc-cover__body">
            <h1 id="svc-title" className="svc-cover__title">
              Campaigns, Shot and Run by <em>One Team.</em>
            </h1>
            <p className="svc-cover__lede reveal">
              We shoot the film and run your social, ads and search as one
              campaign, measured on the numbers you already keep.
            </p>
            <p className="svc-cover__actions reveal">
              <Link
                href="/contact/"
                className="pill pill--light magnetic"
                data-track="cta_click"
                data-cta-location="services_index"
              >
                Start a conversation
                <span className="pill__arrow" aria-hidden="true">
                  <Arrow />
                </span>
              </Link>
              <a href="#partnerships" className="pill pill--ghost magnetic">
                See the packages
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* ---------- the campaign, in five parts ---------- */}
      <section id="campaign" className="section section--anchor">
        <div className="stack stack--head stack--head-center">
          <p className="kick kick--rule reveal">How a campaign runs</p>
          <h2 className="arc-title line-mask">
            Seen. Wanted. <em>Booked.</em>
          </h2>
          <p className="text reveal">One shoot feeds every channel. One team runs them all.</p>
        </div>
        <CampaignChapters />
      </section>

      {/* ---------- the partnerships ---------- */}
      <section id="partnerships" className="section section--anchor tone-cream">
        <div className="stack stack--head stack--head-center">
          <p className="kick kick--rule reveal">Partnerships</p>
          <h2 className="sec-title line-mask">Packages Tiered to Fit Your Goals</h2>
          <p className="text reveal">
            Don&apos;t fit the mold? We also do custom marketing plans tailored to you.
          </p>
        </div>

        <div className="plans">
          {partnerships.map((p) => {
            const f = p.frame ? (frames[p.frame] as Frame) : null;
            return (
              <article key={p.slug} className="card plan plan--framed reveal">
                {f ? (
                  <figure className="plan__top">
                    <img
                      src={f.src}
                      alt={f.alt}
                      width={f.w}
                      height={f.h}
                      loading="lazy"
                      style={f.pos ? { objectPosition: f.pos } : undefined}
                    />
                  </figure>
                ) : null}
                <h3 className="plan__name">{p.name}</h3>
                <p className="text">{p.line}</p>
                <ul className="ticks">
                  {p.includes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                {p.note ? <p className="small">{p.note}</p> : null}
                <p className="terms">
                  <span>{p.term}</span>
                  <span>{price(p.price)}</span>
                </p>
                <p>
                  <Link
                    href="/contact/"
                    className="pill pill--ink magnetic"
                    data-track="cta_click"
                    data-cta-location="services_index"
                  >
                    Start a conversation
                    <span className="pill__arrow" aria-hidden="true">
                      <Arrow />
                    </span>
                  </Link>
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* ---------- the first ninety days ---------- */}
      <Process />

      {/* ---------- or one service at a time ---------- */}
      <section className="section">
        <div className="stack stack--head stack--head-center">
          <p className="kick kick--rule reveal">Or one at a time</p>
          <h2 className="sec-title line-mask">Every Part, Sold on Its Own</h2>
        </div>
        <ol className="svc-index">
          {campaign
            .map((part) => getService(part.slug))
            .filter((s) => s.live)
            .map((s, i) => (
              <li key={s.slug} className="reveal">
                <Link href={`/services/${s.slug}/`} className="svc-index__row">
                  <span className="svc-index__n">{String(i + 1).padStart(2, "0")}</span>
                  <span className="svc-index__name">{s.name}</span>
                  <span className="svc-index__claim">{s.claim}</span>
                  <span className="svc-index__terms">{s.terms}</span>
                  <span className="svc-index__go" aria-hidden="true">
                    <Arrow />
                  </span>
                </Link>
              </li>
            ))}
        </ol>
      </section>

      {/* ---------- the closing band ---------- */}
      <section className="section section--band" aria-label="Start a conversation">
        <div className="band band--cta">
          <div className="band__media parallax-media">
            <img
              src={close.src}
              alt={close.alt}
              width={close.w}
              height={close.h}
              loading="lazy"
              style={close.pos ? { objectPosition: close.pos } : undefined}
            />
          </div>
          <div className="band__scrim" aria-hidden="true" />
          <div className="band__center">
            <p className="band__line line-mask">
              We get to know you, your goals, and become an extension of your team.
            </p>
            <Link
              href="/contact/"
              className="pill pill--light magnetic reveal"
              data-track="cta_click"
              data-cta-location="services_index"
            >
              Tell us what needs to move
              <span className="pill__arrow" aria-hidden="true">
                <Arrow />
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
