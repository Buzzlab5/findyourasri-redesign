import Link from 'next/link';

import ToTop from '@/components/ToTop';
import { liveServices, sectors } from '@/lib/content';
import { mailto, phoneLink, site } from '@/lib/site';

const company = [
  { href: '/work/', label: 'Work' },
  { href: '/expeditions/', label: 'Expeditions' },
  { href: '/about/', label: 'About' },
  { href: '/contact/', label: 'Contact' },
  { href: '/privacy/', label: 'Privacy' },
];

/**
 * Shared component B. Page links only, and never one to a hidden page.
 * Socials wait on W5: the findyourasri handles still describe the old
 * leather-goods brand. "All photography shot by Asri." comes back once every
 * frame on the site is decided as owned.
 */
export default function Footer() {
  return (
    <footer className="footer" data-link-location="footer">
      <div className="footer__top">
        <Link href="/" className="footer__mark" aria-label="Asri, home">
          <img
            className="mark-rise"
            src="/img/asri-white.png"
            alt="Asri"
            width={1171}
            height={320}
            loading="lazy"
          />
        </Link>

        <div className="footer__year">
          <p className="reveal">&#169; 2026</p>
          <span className="footer__rule rule-draw" />
        </div>
      </div>

      <div className="footer__cols">
        <div>
          <p className="footer__blurb reveal">
            Marketing and production for hospitality, operators, brands and destinations.
          </p>
          <a href={mailto} className="footer__email reveal">
            {site.email}
          </a>
        </div>

        <FooterList label="Sectors" links={sectors.map((s) => ({ href: `/sectors/${s.slug}/`, label: s.name === 'Global brands' ? 'Brands' : s.name }))} />
        <FooterList label="Services" links={liveServices.map((s) => ({ href: `/services/${s.slug}/`, label: s.name }))} />
        {/* Company and Reach us share the fourth column. */}
        <div className="footer__stack">
          <FooterList label="Company" links={company} />
          <div>
            <p className="footer__label reveal">Reach us</p>
            <ul className="footer__list">
              <li className="reveal">
                <a href={phoneLink} data-phone-country={site.phoneCountry}>
                  {site.whatsapp ? `WhatsApp ${site.phone}` : site.phone}
                </a>
              </li>
              <li className="reveal">{site.base}</li>
              <li className="reveal">{site.hours}</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="footer__bar">
        <p className="footer__fine reveal">&#169; 2026 Asri.</p>
        <div className="footer__sign">
          <ToTop />
        </div>
      </div>
    </footer>
  );
}

function FooterList({ label, links }: { label: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="footer__label reveal">{label}</p>
      <ul className="footer__list">
        {links.map((link) => (
          <li key={link.href} className="reveal">
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
