import { defineConfig } from 'vite';

// Deploy under the project's GitHub Pages path without breaking relative links.
export default defineConfig({
  base: '/Altermath/',
  esbuild: { jsx: 'automatic' },
  build: { outDir: '../dist', emptyOutDir: true, sourcemap: false },
  server: { fs: { allow: ['..'] } },
});
