import type { Metadata } from 'next';

import { liveServices, sectors, type SectorSlug, type ServiceSlug } from '@/lib/content';

/**
 * Single source of truth for the things that appear in more than one place:
 * metadata, structured data, and the contact routes.
 */
export const site = {
  name: 'Asri',
  title: 'Asri: Marketing and Production Agency, Singapore',
  slogan: 'Find Your Story, Find Your Audience, Find Your Asri.',
  url: 'https://findyourasri.com',
  locale: 'en_GB',
  themeColor: '#0C0A08',
  description:
    'Marketing and production for hospitality, operators, global brands and destinations. Content, paid media, search and creator campaigns, run by operators.',
  ogImage: {
    url: 'https://findyourasri.com/img/og-card.jpg',
    width: 1200,
    height: 630,
    alt: 'Three phinisi sailing yachts under full sail, with the Asri logotype',
  },
  email: 'hello@findyourasri.com',
  emailSubject: 'Enquiry from findyourasri.com',
  /**
   * The site's one number is WhatsApp, the number every proposal carries
   * since 5 Oct 2026 (Anthony, 6 Oct: "Use the +1 WhatsApp number on the
   * site"). It replaces +61 422 755 457. `phone` is its display form.
   */
  phone: '+1 757 296 2109',
  phoneHref: '+17572962109',
  phoneCountry: 'US',
  /**
   * Gate A11: the scheduler link for Book a site day. While null the button
   * scrolls to the form on the page instead.
   */
  bookingUrl: null as string | null,
  /** Gate W4: the WhatsApp number, digits only. While null, `phone` shows as a call link. */
  whatsapp: '17572962109' as string | null,
  base: 'Singapore',
  hours: 'Mon to Fri · 09.00 to 17.00 GMT+8',
} as const;

export const mailto = `mailto:${site.email}?subject=${encodeURIComponent(site.emailSubject)}`;

/** The WhatsApp chat link, with the opening line filled in. */
export const whatsappHref = site.whatsapp
  ? `https://wa.me/${site.whatsapp}?text=${encodeURIComponent('Hello Asri, I found you on findyourasri.com.')}`
  : null;

/** The number's link: WhatsApp when there is one, otherwise a call. */
export const phoneLink = whatsappHref ?? `tel:${site.phoneHref}`;

/**
 * Metadata for one route. Titles are drafts for the SEO desk: under 60
 * characters, "Page | Asri", no em dashes. Canonicals are absolute with the
 * trailing slash, because the export writes every route as a folder.
 */
export function pageMetadata({
  path,
  title,
  description,
  index = true,
}: {
  path: string;
  title: string;
  description: string;
  index?: boolean;
}): Metadata {
  const url = `${site.url}${path}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      siteName: site.name,
      title,
      description,
      type: 'website',
      url,
      locale: site.locale,
      images: [site.ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [site.ogImage.url],
    },
    robots: index ? undefined : { index: false, follow: false },
  };
}

export const pages = {
  home: {
    path: '/',
    title: site.title,
    description: site.description,
  },
  work: {
    path: '/work/',
    title: 'Work and Archive | Asri',
    description:
      'Photography and film from a ten-year archive, shot by the crew that would shoot yours.',
  },
  sectors: {
    path: '/sectors/',
    title: 'Who We Work With | Asri',
    description:
      'Marketing and production for hospitality, travel and experience operators, global brands, and destinations and tourism boards.',
  },
  expeditions: {
    path: '/expeditions/',
    title: 'Expeditions | Asri',
    description:
      'Trips for a brand and its guests, planned, hosted, filmed and photographed by one team. San Marzano in Komodo, and itineraries for Bhutan, New Zealand and Mongolia.',
  },
  services: {
    path: '/services/',
    title: 'Services and Partnerships | Asri',
    description:
      'Two partnerships, Growth and Performance, or single services: social media, website and SEO, Meta and Google ads, and bespoke production.',
  },
  about: {
    path: '/about/',
    title: 'About Asri',
    description:
      'Operators and marketers. A decade running venues, expeditions and shoots, and a decade running the marketing built to sell them.',
  },
  contact: {
    path: '/contact/',
    title: 'Contact Asri',
    description:
      'Start with a day on site. We spend a day with your team, then come back with a plan and a number.',
  },
  thankYou: {
    path: '/thank-you/',
    title: 'Thank You | Asri',
    description: 'Your note is with us.',
  },
  privacy: {
    path: '/privacy/',
    title: 'Privacy Notice | Asri',
    description: 'How Asri collects and uses the details you send us.',
  },
} as const;

export const sectorPages: Record<SectorSlug, { title: string; description: string }> = {
  hospitality: {
    title: 'Hospitality Marketing and Content | Asri',
    description:
      'Content, campaigns and channel management for beach clubs, resorts, villas, hotels and restaurants, measured on direct bookings.',
  },
  operators: {
    title: 'Marketing for Charter, Dive and Tour Operators | Asri',
    description:
      'Content, direct-booking campaigns and creator expeditions for liveaboards, charter, dive and tour operators.',
  },
  brands: {
    title: 'Brand Production on Location | Asri',
    description:
      'Campaign creative and full production service on location for brands and their agencies, from scout to master.',
  },
  destinations: {
    title: 'Destination Films and Campaigns | Asri',
    description:
      'Story-led destination films, regional campaigns and creator programmes for tourism boards and regional programmes.',
  },
};

export const servicePages: Record<ServiceSlug, { title: string; description: string }> = {
  'social-media': {
    title: 'Social Media Management | Asri',
    description:
      'Social media management planned against a calendar: captions, publishing, community response and creative direction, on a monthly retainer.',
  },
  'web-and-seo': {
    title: 'Website Management and SEO | Asri',
    description:
      'The site kept current and found in search and AI answers: updates, conversion fixes, technical SEO and monthly reporting.',
  },
  'paid-media': {
    title: 'Meta and Google Ads Management | Asri',
    description:
      'Meta and Google campaigns run together, with conversion tracking set up and checked underneath them.',
  },
  production: {
    title: 'Film and Photography Production | Asri',
    description:
      'One planned production, built to yield sixty to ninety days of reusable photography and film.',
  },
  'creator-campaigns': {
    title: 'Creator and Influencer Campaigns | Asri',
    description: 'Creator campaigns chosen on audience fit, not follower count.',
  },
};

/* ============================================================
   Structured data
   ============================================================ */

export const orgId = `${site.url}/#organization`;

/** The home page's @graph: the organisation, the site and the page. */
export const homeGraph = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'ProfessionalService',
      '@id': orgId,
      name: site.name,
      url: `${site.url}/`,
      logo: `${site.url}/img/icon-512.png`,
      image: site.ogImage.url,
      slogan: site.slogan,
      description: site.description,
      email: site.email,
      telephone: site.phoneHref,
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Singapore',
        addressCountry: 'SG',
      },
      // W1: international clients, Singapore as the base.
      areaServed: 'Worldwide',
      knowsAbout: sectors.map((s) => s.kicker),
      makesOffer: liveServices.map((s) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: s.name, url: `${site.url}/services/${s.slug}/` },
      })),
    },
    {
      '@type': 'WebSite',
      '@id': `${site.url}/#website`,
      url: `${site.url}/`,
      name: site.name,
      publisher: { '@id': orgId },
      inLanguage: 'en',
    },
    {
      '@type': 'WebPage',
      '@id': `${site.url}/#webpage`,
      url: `${site.url}/`,
      name: site.title,
      isPartOf: { '@id': `${site.url}/#website` },
      about: { '@id': orgId },
    },
  ],
};
