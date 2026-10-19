/**
 * Private pitches: no site header or footer, one reader, one pitch. Never linked from the site, never in the
 * sitemap, noindex on every page (and an X-Robots-Tag in netlify.toml), and the content itself is encrypted.
 */
export default function PitchLayout({ children }: { children: React.ReactNode }) {
  return <main id="main">{children}</main>;
}
