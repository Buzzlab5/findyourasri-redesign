import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

const config = [
  { ignores: ['.next/**', 'out/**', 'node_modules/**', 'supabase/**'] },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // The design drives every image from CSS (object-fit, clip-path reveals,
      // per-tile parallax) and the export is unoptimised, so plain <img> is the
      // right primitive here.
      '@next/next/no-img-element': 'off',
    },
  },
];

export default config;
