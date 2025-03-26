import { defineConfig } from 'vite';

export default defineConfig({
  root: './src',                 // Explicitly setting your source folder as root
  base: './',
  build: {
    outDir: '../dist',           // Dist folder at the root, outside 'src'
    emptyOutDir: true,
  },
});
