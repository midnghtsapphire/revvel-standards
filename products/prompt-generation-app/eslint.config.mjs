import next from 'eslint-config-next/core-web-vitals';

const config = [
  {
    ignores: ['.next/**', 'out/**', 'node_modules/**'],
  },
  ...next,
];

export default config;
