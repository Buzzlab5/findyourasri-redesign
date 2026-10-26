import type { Metadata } from 'next';

import PortalApp from '@/components/portal/PortalApp';

/**
 * Madò Onnà's runsheet: the plan, the countdown, what we need from them and how the work is reported, shown in
 * the state our own record says it is in today. The title and description name no client, because a link preview
 * is visible before the password is entered.
 */
export const metadata: Metadata = {
  title: { absolute: 'A private client page | Asri' },
  description: 'A private page from Asri. Enter the password you were sent to open it.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <PortalApp slug="mado-onna" />;
}
