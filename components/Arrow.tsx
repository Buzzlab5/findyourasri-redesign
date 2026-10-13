/**
 * The site's arrows and play mark, drawn as SVG. The characters they replace
 * (↗ and ▶) are emoji on iOS: Safari draws them as a coloured picture however
 * the text is styled. These take the surrounding text's size and colour.
 */
const base = {
  width: '1em',
  height: '1em',
  fill: 'none',
  'aria-hidden': true,
  focusable: false,
  style: { display: 'inline-block', flex: 'none', verticalAlign: '-0.125em' },
} as const;

export function Arrow({ dir = 'upright' }: { dir?: 'upright' | 'right' }) {
  return (
    <svg viewBox="0 0 16 16" {...base}>
      <path
        d={dir === 'right' ? 'M2.5 8h11M9 3.5 13.5 8 9 12.5' : 'M3.5 12.5 12.5 3.5M5.5 3.5h7v7'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Play() {
  return (
    <svg viewBox="0 0 24 24" {...base}>
      <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" />
    </svg>
  );
}
