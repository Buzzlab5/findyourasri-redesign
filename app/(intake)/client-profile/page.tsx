import type { Metadata } from 'next';

import ClientProfileApp from '@/components/client-profile/ClientProfileApp';
import { site } from '@/lib/site';

/**
 * Hidden from search twice over: noindex here and an X-Robots-Tag header in
 * netlify.toml. Not in the sitemap, not in llms.txt, not in robots.txt (a
 * disallow would publish the path). The link preview is the first thing a
 * client sees, so it names no one.
 */
export const metadata: Metadata = {
  title: { absolute: 'Client profile | Asri' },
  description: 'Tell Asri about your business so the marketing and production teams can start with everything they need.',
  robots: { index: false, follow: false },
  openGraph: {
    siteName: site.name,
    title: 'Client profile | Asri',
    description: 'Tell Asri about your business so the marketing and production teams can start with everything they need.',
    type: 'website',
    url: `${site.url}/client-profile/`,
    locale: site.locale,
    images: [site.ogImage],
  },
};

export default function ClientProfilePage() {
  return <ClientProfileApp />;
}
