import { chromeExtension } from '$src'
import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import path from 'path'

export default {
  input: ['src/manifest.json'],
  output: {
    dir: 'dist',
    format: 'esm',
    chunkFileNames: 'chunks/[name]-[hash].js',
  },
  plugins: [
    chromeExtension(),
    babel({
      // Do not transpile dependencies
      ignore: [path.resolve(__dirname, '../../../node_modules')],
      babelHelpers: 'bundled',
      configFile: path.resolve(__dirname, 'babel.config.json'),
    }),
    resolve({
      extensions: ['.mjs', '.js', '.json', '.node', '.jsx'],
    }),
    commonjs(),
  ],
}
