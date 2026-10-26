import Link from 'next/link';

/**
 * The team's own pages: the logo and the page, nothing else. Not linked from the
 * site, noindex on every page, and everything on them sits behind a sign-in.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="wrap">
      <header className="header header--focus">
        <div className="header__row">
          <Link href="/" className="header__logo hdr-item" aria-label="Asri, home">
            <img src="/img/asri-white.png" alt="Asri" width={1171} height={320} />
          </Link>
        </div>
      </header>
      <main id="main">{children}</main>
    </div>
  );
}
