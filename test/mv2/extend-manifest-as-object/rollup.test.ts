import { isAsset, isChunk } from '$src/helpers'
import { getRollupOutput } from '$test/helpers/getRollupOutput'
import { byFileName } from '$test/helpers/utils'
import { OutputAsset } from 'rollup'

const outputPromise = getRollupOutput(
  __dirname,
  'rollup.config.js',
)

test('bundles chunks', async () => {
  const { output } = await outputPromise

  // Chunks
  const chunks = output.filter(isChunk)

  expect(output.find(byFileName('background.js'))).toBeDefined()
  expect(output.find(byFileName('content.js'))).toBeDefined()

  // 2 chunks
  expect(chunks.length).toBe(2)
})

test('bundles assets', async () => {
  const { output } = await outputPromise

  // Assets
  const assets = output.filter(isAsset)

  expect(output.find(byFileName('manifest.json'))).toBeDefined()
  expect(
    output.find(byFileName('background.esm-wrapper.js')),
  ).toBeDefined()

  expect(
    output.find(byFileName('images/icon-main-16.png')),
  ).toBeDefined()
  expect(
    output.find(byFileName('images/icon-main-48.png')),
  ).toBeDefined()
  expect(
    output.find(byFileName('images/icon-main-128.png')),
  ).toBeDefined()

  expect(assets.length).toBe(5)
})

test('extends the manifest', async () => {
  const { output } = await outputPromise

  const manifestAsset = output.find(
    byFileName('manifest.json'),
  ) as OutputAsset
  const manifest = JSON.parse(
    manifestAsset.source as string,
  ) as chrome.runtime.Manifest

  // Changes from extendManifest
  expect(manifest).toMatchObject({
    content_scripts: [
      expect.objectContaining({
        // Content script is IIFE
        js: ['content.js'],
        matches: ['https://www.google.com/*'],
      }),
    ],
    description:
      'properties from options.extendManifest are preferred',
  })

  // Original data from manifest.json
  expect(manifest).toMatchObject({
    background: {
      // Background script ESM wrapper
      scripts: ['background.esm-wrapper.js'],
    },
    icons: {
      '16': 'images/icon-main-16.png',
      '48': 'images/icon-main-48.png',
      '128': 'images/icon-main-128.png',
    },
    manifest_version: 2,
    name: 'options.extendManifest as object',
    version: '1.0.0',
  })
})
