import Link from 'next/link';

import SlimFooter from '@/components/SlimFooter';

/**
 * The team's own pages: the logo, the page and the site's slim footer. Not linked from the site, noindex on
 * every page, and everything on them sits behind a sign-in. The shell is as tall as the screen, so a short
 * page still ends at the footer instead of in a wide band of black.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="wrap tm-shell">
      <header className="header header--focus">
        <div className="header__row">
          <Link href="/" className="header__logo hdr-item" aria-label="Asri, home">
            <img src="/img/asri-white.png" alt="Asri" width={1171} height={320} />
          </Link>
        </div>
      </header>
      <main id="main">{children}</main>
      <SlimFooter />
    </div>
  );
}
