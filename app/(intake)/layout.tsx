import Link from 'next/link';

import SlimFooter from '@/components/SlimFooter';

/**
 * The client profile intake: the logo, one form, the slim footer. No nav, no
 * call to action, and nothing on the site links here. Asri sends the link by
 * hand, so the page goes to one reader with one job.
 */
export default function IntakeLayout({ children }: { children: React.ReactNode }) {
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
      <SlimFooter />
    </div>
  );
}
