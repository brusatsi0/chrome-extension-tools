/* eslint-disable @typescript-eslint/explicit-function-return-type */
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import { chromeExtension } from '../../../src/index'

export default {
  input: path.join(__dirname, 'manifest.json'),
  output: {
    dir: path.join(__dirname, 'dist'),
    format: 'esm',
  },
  plugins: [
    chromeExtension({
      verbose: false,
      extendManifest: {
        description:
          'properties from options.extendManifest are preferred',
        content_scripts: [
          {
            js: ['content.js'],
            matches: ['https://www.google.com/*'],
          },
        ],
      },
    }),
    resolve(),
    commonjs(),
  ],
}
