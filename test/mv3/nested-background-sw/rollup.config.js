import { chromeExtension, simpleReloader } from '$src'
import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import path from 'path'

export default {
  input: [path.join(__dirname, 'src', 'manifest.json')],
  output: {
    dir: path.join(__dirname, 'dist'),
    format: 'esm',
    chunkFileNames: 'chunks/[name]-[hash].js',
  },
  plugins: [
    chromeExtension(),
    // Adds a Chrome extension reloader during watch mode
    simpleReloader(),
    resolve(),
    commonjs(),
  ],
}
