import { parse, join } from 'path'
import { isMV2, isMV3, RPCEPlugin } from './types'
import { VITE_SERVER_URL } from './viteAdaptor.machine'
import { code as backgroundEsmWrapper } from 'code ./browser/backgroundEsmWrapper.ts'

export const esmImportWrapperFileNameExt = '.esm-wrapper.js'

export const getWrapperFileName = (fileName: string) => {
  const { dir, name } = parse(fileName)
  return join(dir, name + esmImportWrapperFileNameExt)
}

export const generateFileNames = (fileName: string) => {
  const { dir, name } = parse(fileName)
  const wrapperFileName = join(
    dir,
    name + esmImportWrapperFileNameExt,
  )
  const outputFileName = join(dir, name + '.js')

  return { outputFileName, wrapperFileName }
}

export const esmBackground = (): RPCEPlugin => {
  let isViteServe = false

  return {
    name: 'crx-esm-background',
    configureServer() {
      isViteServe = true
    },
    renderCrxManifest(manifest) {
      if (isMV2(manifest) && manifest.background?.scripts) {
        const { scripts } = manifest.background
        manifest.background.scripts = scripts?.map(
          (fileName) => {
            const { outputFileName, wrapperFileName } =
              generateFileNames(fileName)

            const importPath = JSON.stringify(
              isViteServe
                ? `${VITE_SERVER_URL}/${fileName}`
                : `./${outputFileName}`,
            )

            this.emitFile({
              type: 'asset',
              fileName: wrapperFileName,
              source: backgroundEsmWrapper.replace(
                '%PATH%',
                importPath,
              ),
            })

            return wrapperFileName
          },
        )
      } else if (
        isMV3(manifest) &&
        manifest.background?.service_worker
      ) {
        manifest.background.type = 'module'
        if (isViteServe) {
          const { service_worker: sw } = manifest.background
          const { wrapperFileName } = generateFileNames(sw)

          const importPath = JSON.stringify(
            `${VITE_SERVER_URL}/${sw}`,
          )

          this.emitFile({
            type: 'asset',
            fileName: wrapperFileName,
            source: `import "${importPath}"`,
          })
        }
      }

      return manifest
    },
  }
}
