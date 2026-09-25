import react from '@vitejs/plugin-react';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.join(here, 'ui'),
  publicDir: false,
  plugins: [react()],
  server: {fs: {allow: [path.resolve(here, '..')]}},
  logLevel: 'warn',
});
