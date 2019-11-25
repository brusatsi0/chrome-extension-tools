import path from 'path'
import assert from 'assert'

import fs from 'fs-extra'
import cheerio from 'cheerio'

import {
  getCssHrefs,
  getImgSrcs,
  getScriptSrc,
} from '../../src/html-inputs/cheerio'

const loadHtml = async (name) => {
  const fixtures = 'tests/html-inputs/fixtures'
  const popup = 'popup.html'
  const filePath = path.join(fixtures, name, popup)

  const html = await fs.readFile(filePath, 'utf8')
  const $ = cheerio.load(html)

  return Object.assign($, { filePath })
}

test('getScriptSrc', async () => {
  const name = 'basic'
  const param = await loadHtml(name)

  const jsEntries = getScriptSrc(param)

  expect(jsEntries).toBeInstanceOf(Array)
  expect(jsEntries.length).toBe(1)

  assert(jsEntries.some((s) => s.endsWith('popup.js')))
  assert(jsEntries.every((s) => s.endsWith('.js')))
  assert(jsEntries.every((s) => !s.endsWith('.html')))
})

test('getTsEntries', async () => {
  const name = 'with-ts'
  const param = await loadHtml(name)

  const jsEntries = getScriptSrc(param)

  expect(jsEntries).toBeInstanceOf(Array)
  expect(jsEntries.length).toBe(1)

  assert(jsEntries.some((s) => s.endsWith('popup.ts')))
  assert(jsEntries.every((s) => s.endsWith('.ts')))
  assert(jsEntries.every((s) => !s.endsWith('.html')))
})

test.skip('getJsAssets', async () => {
  // const name = 'with-assets'
  // const param = await loadHtml(name)
  // const jsAssets = getJsAssets(param)
  // expect(jsAssets).toBeInstanceOf(Array)
  // expect(jsAssets.length).toBe(1)
  // assert(jsAssets.some((s) => s.endsWith('react.js')))
  // assert(jsAssets.every((s) => s.endsWith('.js')))
  // assert(jsAssets.every((s) => !s.endsWith('.html')))
})

test('getCssHrefs', async () => {
  const name = 'with-styles'
  const param = await loadHtml(name)

  const cssHrefs = getCssHrefs(param)

  expect(cssHrefs).toBeInstanceOf(Array)
  expect(cssHrefs.length).toBe(1)

  assert(cssHrefs.some((s) => s.endsWith('popup.css')))
  assert(cssHrefs.every((s) => s.endsWith('.css')))
  assert(cssHrefs.every((s) => !s.endsWith('.html')))
})

test('getImgSrc', async () => {
  const name = 'with-image'
  const param = await loadHtml(name)

  const imageSrcs = getImgSrcs(param)

  expect(imageSrcs).toBeInstanceOf(Array)
  expect(imageSrcs.length).toBe(2)

  assert(imageSrcs.every((s) => s.endsWith('.png')))
  assert(imageSrcs.every((s) => !s.endsWith('.html')))

  const image =
    'tests/html-inputs/fixtures/with-image/images/icon-on-16.png'
  const favicon =
    'tests/html-inputs/fixtures/with-image/images/favicon.png'

  assert(imageSrcs.includes(image))
  assert(imageSrcs.includes(favicon))
})
