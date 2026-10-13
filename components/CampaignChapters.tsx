import Link from 'next/link';

import { campaign, frames, getService, type CampaignPart, type Frame } from '@/lib/content';
import { Arrow } from '@/components/Arrow';

/**
 * The services page's spine: one campaign in five parts, each a service,
 * each led by its pictures. Rows alternate picture left and right. Every
 * word is the service's own (title, body, terms); the part's name and its
 * stages sit above it as the proposals' kicker.
 *
 * The visuals borrow the proposals' pages: a collage for the shoot, the
 * social page's labelled mosaic for the feed, a tall frame for the creators,
 * the ads page's "Seen, Wanted, Booked" box for the push, and the website
 * page's browser for the site.
 */
export default function CampaignChapters() {
  const parts = campaign.filter((part) => getService(part.slug).live);

  return (
    <ol className="chapters">
      {parts.map((part, i) => {
        const service = getService(part.slug);
        const n = String(i + 1).padStart(2, '0');
        return (
          <li key={part.slug} className={`chapter chapter--${part.visual}${i % 2 ? ' chapter--flip' : ''}`}>
            <div className="chapter__visual">
              <Visual part={part} />
            </div>
            <div className="chapter__body">
              <p className="chapter__n reveal" aria-hidden="true">
                {n}
              </p>
              <p className="kick reveal">
                {part.chapter}
                <span className="chapter__dot" aria-hidden="true" />
                {service.stages.join(' · ')}
              </p>
              <h3 className="chapter__title line-mask">{service.title}</h3>
              <p className="text reveal">{service.body}</p>
              <p className="chapter__foot reveal">
                <span className="chapter__terms">{service.terms}</span>
                <Link
                  href={`/services/${service.slug}/`}
                  className="chapter__link"
                  data-track="cta_click"
                  data-cta-location="services_campaign"
                >
                  {service.name}
                  <span aria-hidden="true"> <Arrow /></span>
                </Link>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Img({ frame, loading = 'lazy' }: { frame: Frame; loading?: 'lazy' | 'eager' }) {
  return (
    <img
      src={frame.src}
      alt={frame.alt}
      width={frame.w}
      height={frame.h}
      loading={loading}
      decoding="async"
      style={frame.pos ? { objectPosition: frame.pos } : undefined}
    />
  );
}

function Visual({ part }: { part: CampaignPart }) {
  const f = part.frames.map((id) => frames[id] as Frame);

  if (part.visual === 'collage') {
    // The wide frame, and a second one laid over its corner.
    return (
      <div className="collage2">
        <figure className="collage2__main clip-reveal">
          <div className="parallax-media">
            <Img frame={f[0]} />
          </div>
        </figure>
        {f[1] ? (
          <figure className="collage2__inset clip-reveal">
            <Img frame={f[1]} />
          </figure>
        ) : null}
      </div>
    );
  }

  if (part.visual === 'mosaic') {
    return (
      <div className="feed">
        {f.map((frame, i) => (
          <figure key={frame.id} className="feed__tile reveal">
            <Img frame={frame} />
            {part.labels?.[i] ? (
              <figcaption className="feed__label" aria-hidden="true">
                {part.labels[i]}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    );
  }

  if (part.visual === 'boxed') {
    // The proposals' ads page: the photograph, and the three words a
    // campaign moves someone through, in a gold hairline box.
    return (
      <div className="boxed">
        <figure className="boxed__media clip-reveal">
          <div className="parallax-media">
            <Img frame={f[0]} />
          </div>
        </figure>
        <p className="boxed__box reveal" aria-label="Seen, wanted, booked">
          <span>Seen</span>
          <i aria-hidden="true" />
          <span>Wanted</span>
          <i aria-hidden="true" />
          <span>Booked</span>
        </p>
      </div>
    );
  }

  if (part.visual === 'browser') {
    // The proposals' website page: a browser holding the photograph, with a
    // booking bar across its foot. Decoration only; nothing in it is a link.
    return (
      <div className="browser reveal" aria-hidden="true">
        <div className="browser__bar">
          <span className="browser__dots">
            <i />
            <i />
            <i />
          </span>
          <span className="browser__url">yourbrand.com</span>
        </div>
        <div className="browser__view">
          <Img frame={f[0]} />
          <div className="browser__book">
            <span>Arrive</span>
            <span>Depart</span>
            <span>Guests</span>
            <b>Book direct</b>
          </div>
        </div>
      </div>
    );
  }

  // portrait
  return (
    <figure className="portrait clip-reveal">
      <div className="parallax-media">
        <Img frame={f[0]} />
      </div>
    </figure>
  );
}
