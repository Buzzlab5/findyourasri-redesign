/**
 * Private client pages: no site header or footer, one reader, one engagement. Never linked from the site, never
 * in the sitemap, noindex on every page (with an X-Robots-Tag in netlify.toml as well), and the content itself is
 * encrypted until the client enters the password we sent them.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <main id="main">{children}</main>;
}
