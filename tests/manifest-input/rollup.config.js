/* eslint-env node */

import { join, relative } from 'path'
import pkg from './package.json'
import { emptyDir } from 'rollup-plugin-empty-dir'
import htmlInputs from '../../src/html-inputs/index'
import manifestInput from '../../src/manifest-input/index'

const fixture = (name) =>
  relative(process.cwd(), join(__dirname, 'fixtures', name))

export default {
  input: fixture('src/manifest.json'),
  output: {
    dir: fixture('dest'),
    format: 'esm',
  },
  plugins: [
    manifestInput({ pkg }),
    htmlInputs({ srcDir: fixture('src') }),
    emptyDir(),
  ],
}
