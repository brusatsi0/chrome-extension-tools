import { filesWritten } from '$src/viteAdaptor'
import fs from 'fs-extra'
import path from 'path'
import { createServer, ViteDevServer } from 'vite'

const outDir = path.join(__dirname, 'dist-serve')

let devServer: ViteDevServer
beforeAll(async () => {
  await fs.remove(outDir)

  devServer = await createServer({
    configFile: path.join(__dirname, 'vite.config.ts'),
    envFile: false,
    build: { outDir },
  })
})

afterAll(async () => {
  await devServer.close()
})

test('writes entry points to disk', async () => {
  expect(fs.existsSync(outDir)).toBe(false)

  await Promise.all([devServer.listen(), filesWritten()])

  const { port } = devServer.config.server

  expect(fs.existsSync(outDir)).toBe(true)

  const manifest = 'manifest.json'
  const popup = 'pages/popup/index.html'
  const content = 'content/index.js'
  const background = 'background/index.esm-wrapper.js'

  const manifestPath = path.join(outDir, manifest)
  const manifestSource = await fs.readJson(manifestPath)

  expect(manifestSource).toMatchObject({
    browser_action: {
      default_popup: popup,
    },
    background: {
      scripts: [background],
    },
    content_scripts: [
      {
        js: [content],
        matches: ['https://a.com/*', 'http://b.com/*'],
      },
    ],
  })

  const contentPath = path.join(outDir, content)
  const contentSource = await fs.readFile(contentPath, 'utf8')
  expect(contentSource).toMatch('console.log("content script");')

  const popupPath = path.join(outDir, popup)
  const popupSource = await fs.readFile(popupPath, 'utf8')
  expect(popupSource).toMatch(
    `<script src="http://localhost:${port}/pages/popup/index.tsx" type="module">`,
  )

  const backgroundPath = path.join(outDir, background)
  const backgroundSource = await fs.readFile(
    backgroundPath,
    'utf8',
  )
  expect(backgroundSource).toMatch(
    `const importPath = /*@__PURE__*/JSON.parse('"http://localhost:${port}/background/index.ts"');`,
  )
}, 60000)
