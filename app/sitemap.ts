import type { MetadataRoute } from 'next';

import { liveServices, liveWorkCategories, sectors } from '@/lib/content';
import { projectHref, projects } from '@/lib/projects';
import { site } from '@/lib/site';

export const dynamic = 'force-static';

/**
 * Every indexable route, generated from the route data. Left out on purpose:
 * the thank-you page, /privacy/ and every hidden page.
 */
const indexedRoutes = [
  '/',
  '/work/',
  ...liveWorkCategories.flatMap((c) => [
    `/work/${c.slug}/`,
    ...(c.tabs ?? []).slice(1).map((t) => `/work/${c.slug}/${t.slug}/`),
  ]),
  ...projects.map(projectHref),
  '/expeditions/',
  '/sectors/',
  ...sectors.map((s) => `/sectors/${s.slug}/`),
  '/services/',
  ...liveServices.map((s) => `/services/${s.slug}/`),
  '/about/',
  '/contact/',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return indexedRoutes.map((path) => ({
    url: `${site.url}${path}`,
    lastModified,
    changeFrequency: 'monthly',
    priority: path === '/' ? 1 : 0.8,
  }));
}
