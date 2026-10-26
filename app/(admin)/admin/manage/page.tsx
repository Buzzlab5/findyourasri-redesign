import type { Metadata } from 'next';

import ManageApp from '@/components/admin/ManageApp';

/** Never indexed, never in the sitemap, and nothing loads without the team sign-in made on /admin/. */
export const metadata: Metadata = {
  title: { absolute: 'Manage profiles | Asri' },
  description: 'Asri team area.',
  robots: { index: false, follow: false },
};

export default function ManagePage() {
  return <ManageApp />;
}
