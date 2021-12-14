import fs from 'fs'
import { isUndefined } from 'lodash'
import {
  EmittedChunk,
  InputOptions,
  OutputOptions,
  Plugin,
  rollup,
} from 'rollup'
import { ViteDevServer } from 'vite'
import { format, isString } from './helpers'
import { join, relative } from './path'
import { RPCEPlugin } from './types'

export async function writeAsIIFE(
  file: EmittedChunk,
  server: ViteDevServer,
  plugins: Set<RPCEPlugin>,
): Promise<void> {
  try {
    const inputOptions: InputOptions = {
      input: relative(server.config.root, file.id),
      plugins: [resolveFromServer(server)],
    }
    const build = await rollup(inputOptions)
    const options: OutputOptions = {
      format: 'iife',
      file: join(server.config.build.outDir, file.fileName!),
      plugins: [
        {
          name: 'vite-serve-render-chunk-driver',
          async renderChunk(code, chunk, options) {
            for (const p of plugins) {
              await p?.viteServeRenderChunk?.(
                code,
                chunk,
                options,
              )
            }

            return null
          },
        },
      ],
    }
    await build.write(options)
  } catch (error) {
    if (error.message?.includes('is not exported by')) {
      // TODO: add documentation with example
      const message = format`Could not bundle ${file.id} because Vite did not pre-bundle a dependency.
          You may need to add this dependency to your Vite config under \`optimizeDeps.include\`.
          Original Error: ${error.message}`
      throw new Error(message)
    } else if (error.message)
      throw new Error(
        format`An error occurred while writing ${file.id}
        Error: ${error.message}`,
      )
    else throw error
  }
}

export function resolveFromServer(
  server: ViteDevServer,
): Plugin {
  return {
    name: 'resolve-from-vite-dev-server',
    resolveId(source) {
      if (source.startsWith('/@fs')) return source

      const id = join(server.config.root, source)
      const fileExists = fs.existsSync(id)
      return fileExists ? id : source
    },
    async load(id) {
      try {
        const result = await server.transformRequest(id)
        if (!result) return null
        if (isString(result)) return result
        if (isUndefined(result.code)) return null

        const { code, map } = result
        return { code, map }
      } catch (error) {
        console.log(`Could not load ${id}`)
        console.error(error)
        return null
      }
    },
  }
}
