import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

const root = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');

export default defineConfig({
  root: `${root}/apps/web`,
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: [
      { find: /^@engine\/([^/]+)$/, replacement: `${root}/engine/$1/src` },
      { find: /^@library\/(.*)$/, replacement: `${root}/knowledge-library/$1` },
    ],
  },
  server: { fs: { allow: [root] } },
  build: { outDir: `${root}/dist`, emptyOutDir: true },
});
