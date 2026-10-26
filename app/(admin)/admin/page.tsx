import type { Metadata } from 'next';

import AdminApp from '@/components/admin/AdminApp';

/** Never indexed, never in the sitemap, and the content only loads after a team sign-in. */
export const metadata: Metadata = {
  title: { absolute: 'Team | Asri' },
  description: 'Asri team area.',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminApp />;
}
