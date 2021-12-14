import { chromeExtension } from '$src'
import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src',
  clearScreen: false,
  logLevel: 'error',
  build: {
    emptyOutDir: true,
    minify: false,
    sourcemap: 'inline',
    rollupOptions: {
      input: 'src/manifest.json',
      output: {
        // TODO: set entryFileNames in options hook
        //  - vite produces an invalid build w/o entryFileNames
        entryFileNames: '[name].js',
      },
    },
  },
  plugins: [chromeExtension()],
  cacheDir: '.vite',
  optimizeDeps: {
    include: ['react', 'react-dom', '@extend-chrome/storage'],
  },
})
