import type { Metadata } from 'next';

import PitchApp from '@/components/pitch/PitchApp';

/**
 * San Marzano x Mongolia, June 2028: the interactive version of the A4 menu (Anthony, 19 Oct 2026). The title and
 * description name no client, because a link preview is visible before the password is entered.
 */
export const metadata: Metadata = {
  title: { absolute: 'A private pitch | Asri' },
  description: 'A private pitch from Asri. Enter the password you were sent to open it.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <PitchApp slug="san-marzano-mongolia" />;
}
