export default [
  {
    ignores: ['.next/**', 'out/**', 'node_modules/**'],
  },
];
import next from 'eslint-config-next/core-web-vitals';

const config = [
  ...next
];

export default config;
