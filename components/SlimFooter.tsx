import Link from 'next/link';

import { mailto, phoneLink, site } from '@/lib/site';
import { Arrow } from '@/components/Arrow';

/** Shared component B, slim variant, for hidden pages: one row of the mark, the contact lines, a link to the full site and the fine print. */
export default function SlimFooter() {
  return (
    <footer className="footer footer--slim" data-link-location="footer">
      <div className="footer__slim">
        <img src="/img/asri-white.png" alt="Asri" width={1171} height={320} loading="lazy" className="footer__slim-mark" />
        <p className="footer__slim-lines">
          <a href={mailto}>{site.email}</a>
          <span aria-hidden="true"> · </span>
          <a href={phoneLink} data-phone-country={site.phoneCountry}>
            {site.whatsapp ? `WhatsApp ${site.phone}` : site.phone}
          </a>
          <span aria-hidden="true"> · </span>
          {site.base}
        </p>
        <Link href="/" className="footer__slim-link">
          See the full site <Arrow dir="right" />
        </Link>
        <p className="footer__fine">&#169; 2026 Asri.</p>
      </div>
    </footer>
  );
}
