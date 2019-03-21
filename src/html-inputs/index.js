import path from 'path'
import fs from 'fs-extra'

import {
  getCssLinks,
  getJsEntries,
  getJsAssets,
  loadHtml,
  getImgSrc,
} from './cheerio'

/* ------------- helper functions ------------- */

const not = fn => x => !fn(x)

const isHtml = path => /\.html?$/.test(path)

const resolveEntriesWith = htmlPaths => (jsSrcs, i) => {
  return jsSrcs.map(src => path.join(path.dirname(htmlPaths[i]), src))
}

export default function htmlInputs() {
  /* -------------- hooks closures -------------- */
  let htmlFiles
  let destDir

  /* --------------- plugin object -------------- */
  return {
    name: 'html-inputs',

    /* ============================================ */
    /*                 OPTIONS HOOK                 */
    /* ============================================ */

    options({ input, ...inputOptions }) {
      // Filter htm and html files
      const htmlPaths = input.filter(isHtml)

      const inputs = input.filter(not(isHtml))

      // Extract links from html files
      // and transform to relative paths
      const html$ = htmlPaths.map(loadHtml)

      const jsEntries = html$
        .map(getJsEntries)
        .map(resolveEntriesWith(htmlPaths))
        .flat()

      // Throw for unsupported assets
      const cssLinks = html$.flatMap(getCssLinks)
      const imgSrcs = html$.flatMap(getImgSrc)
      const jsAssets = html$.flatMap(getJsAssets)

      if (cssLinks.length > 0) {
        throw new Error('Stylesheets within HTML files are unsupported.')
      } else if (imgSrcs.length > 0) {
        throw new Error('Images within HTML files are unsupported.')
      } else if (jsAssets.length > 0) {
        throw new Error('JS assets within HTML files are unsupported.')
      }

      htmlFiles = html$.map(($, i) => [
        path.basename(htmlPaths[i]),
        $.html(),
      ])

      // Return new input options
      return {
        ...inputOptions,
        input: inputs.concat(jsEntries),
      }
    },

    /* ============================================ */
    /*                GENERATEBUNDLE                */
    /* ============================================ */

    generateBundle({ dir }) {
      destDir = dir
    },

    writeBundle() {
      const writeFile = dest => ([htmlPath, htmlSrc]) => {
        fs.writeFile(path.join(dest, htmlPath), htmlSrc)
      }

      htmlFiles.forEach(writeFile(destDir))
    },
  }
}
