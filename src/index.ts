import { createFilter } from '@rollup/pluginutils'
import { PluginContext, RollupOptions } from 'rollup'
import { Plugin } from 'vite'
import { machine, model } from './files.machine'
import { SharedEvent } from './files.sharedEvents'
import {
  debugHelper,
  logActorStates,
  narrowEvent,
  useConfig,
  useMachine,
} from './files_helpers'
import {
  getJsFilename,
  isString,
  isUndefined,
  not,
} from './helpers'
import { runPlugins } from './index_runPlugins'
import { basename, isAbsolute, join } from './path'
import { autoPerms } from './plugin-autoPerms'
import { browserPolyfill } from './plugin-browserPolyfill'
import { esmBackground } from './plugin-esmBackground'
import { extendManifest } from './plugin-extendManifest'
import { fileNames } from './plugin-fileNames'
import { htmlPaths } from './plugin-htmlPaths'
import { hybridFormat } from './plugin-hybridOutput'
import { packageJson } from './plugin-packageJson'
import {
  preValidateManifest,
  validateManifest,
} from './plugin-validateManifest'
import { viteCrxHtml } from './plugin-viteCrxHtml'
import { viteServeCsp } from './plugin-viteServeCsp'
import { isRPCE } from './plugin_helpers'
import type {
  Asset,
  ChromeExtensionOptions,
  CompleteFile,
  ManifestV2,
  ManifestV3,
  RPCEHookType,
  RPCEPlugin,
} from './types'
import { useViteAdaptor } from './viteAdaptor'

export { simpleReloader } from './plugins-simpleReloader'
export { useViteAdaptor }
export type { ManifestV3, ManifestV2 }

function getAbsolutePath(input: string): string {
  return isAbsolute(input) ? input : join(process.cwd(), input)
}

export const stubId = '_stubIdForRPCE'

export const chromeExtension = (
  pluginOptions: ChromeExtensionOptions = {},
): Plugin => {
  const isHtml = createFilter(['**/*.html'])

  const { send, service, waitFor } = useMachine(machine, {
    devTools: true,
  })

  const files = new Map<
    string,
    CompleteFile & { source?: string | Uint8Array }
  >()

  let isViteServe = false
  const [finalValidator, ...builtins]: RPCEPlugin[] = [
    validateManifest(), // we'll make this run last of all
    packageJson(),
    extendManifest(pluginOptions),
    autoPerms(),
    preValidateManifest(),
    esmBackground(),
    hybridFormat(),
    pluginOptions.browserPolyfill && browserPolyfill(),
    fileNames(),
    htmlPaths(),
    viteCrxHtml(),
    viteServeCsp(),
  ]
    .filter((x): x is RPCEPlugin => !!x)
    .map((p) => ({ ...p, name: `crx:${p.name}` }))
    .map(useViteAdaptor)

  const allPlugins = new Set<RPCEPlugin>(builtins)
  function setupPluginsRunner(
    this: PluginContext,
    hook: RPCEHookType,
  ) {
    const plugins = Array.from(allPlugins)
    useConfig(service, {
      services: {
        // TODO: run render hooks in generateBundle
        // - vite server port will be available
        // - generate bundle runs in all modes now
        pluginsRunner: () => (send, onReceived) => {
          onReceived(async (e: SharedEvent) => {
            try {
              const event = narrowEvent(e, 'PLUGINS_START')
              const result = await runPlugins.call(
                this,
                plugins,
                event as Asset,
                hook,
              )

              send(model.events.PLUGINS_RESULT(result))
            } catch (error) {
              send(model.events.ERROR(error))
            }
          })
        },
      },
    })
  }

  return useViteAdaptor({
    name: 'chrome-extension',

    api: {
      files,
      /** The updated root folder, derived from either the Vite config or the manifest dirname */
      get root() {
        return service.getSnapshot().context.root
      },
    },

    async config(config, env) {
      isViteServe = env.command === 'serve'

      // Vite ignores changes to config.plugin, so we're adding them in configResolved
      // Just running the config hook for the builtins here for thoroughness
      for (const b of builtins) {
        const result = await b?.config?.call(this, config, env)
        config = result ?? config
      }

      if (isString(config.root))
        send(model.events.ROOT(config.root))

      if (isViteServe)
        send(model.events.EXCLUDE_FILE_TYPE('MODULE'))

      return config
    },

    async configureServer(server) {
      const cbs = new Set<() => void | Promise<void>>()
      for (const b of builtins) {
        const result = await b?.configureServer?.call(
          this,
          server,
        )
        result && cbs.add(result)
      }

      return async () => {
        try {
          for (const cb of cbs) {
            await cb()
          }
        } finally {
          cbs.clear()
        }
      }
    },

    async configResolved(config) {
      // Save user plugins to run RPCE hooks in buildStart
      config.plugins
        .filter(not(isRPCE))
        .forEach((p) => p && allPlugins.add(p))

      if (isViteServe) {
        // Just do this in Vite serve
        // We can't add them in the config hook :/
        // but sync changes in this hook seem to work...
        // TODO: test this specifically in new Vite releases
        const rpceIndex = config.plugins.findIndex(isRPCE)
        // @ts-expect-error Sorry Vite, I'm ignoring your `readonly`!
        config.plugins.splice(rpceIndex, 0, ...builtins)
        // @ts-expect-error Sorry Vite, I'm ignoring your `readonly`!
        config.plugins.push(finalValidator)
      }

      // Run possibly async builtins last
      // After this, Vite will take over
      for (const b of builtins) {
        await b?.configResolved?.call(this, config)
      }
    },

    async options({ input = [], ...options }) {
      let finalInput: RollupOptions['input'] = [stubId]
      if (isString(input)) {
        send(
          model.events.ADD_FILE({
            id: getAbsolutePath(input),
            fileType: 'MANIFEST',
            fileName: 'manifest.json',
          }),
        )
      } else if (Array.isArray(input)) {
        // Don't include html or manifest files
        const result: string[] = []
        input.forEach((id) => {
          if (isHtml(id))
            send(
              model.events.ADD_FILE({
                id: getAbsolutePath(id),
                fileType: 'HTML',
                fileName: id,
              }),
            )
          else if (basename(id).startsWith('manifest'))
            send(
              model.events.ADD_FILE({
                id: getAbsolutePath(id),
                fileType: 'MANIFEST',
                fileName: 'manifest.json',
              }),
            )
          else {
            result.push(id)
          }
        })

        if (result.length) finalInput = result
      } else {
        const result: [string, string][] = []
        Object.entries(input).forEach(([fileName, id]) => {
          if (isHtml(id))
            send(
              model.events.ADD_FILE({
                id: getAbsolutePath(id),
                fileType: 'HTML',
                fileName: fileName.endsWith('.html')
                  ? fileName
                  : fileName + '.html',
              }),
            )
          else if (basename(id).startsWith('manifest'))
            send(
              model.events.ADD_FILE({
                id: getAbsolutePath(id),
                fileType: 'MANIFEST',
                fileName: 'manifest.json',
              }),
            )
          else {
            result.push([fileName, id])
          }
        })

        if (result.length)
          finalInput = Object.fromEntries(result)
      }

      // Vite will run this hook for all our added plugins,
      // but we still need to add builtin plugins for Rollup
      // TODO: check if this needs to be done in Rollup watch mode
      if (!isViteServe) {
        for (const b of builtins) {
          await b?.options?.call(this, options)
        }

        options.plugins = (options.plugins ?? []).concat(
          builtins,
        )
        options.plugins.push(finalValidator)
      }

      return { input: finalInput, ...options }
    },

    async buildStart({ plugins: rollupPlugins = [] }) {
      rollupPlugins
        .filter(not(isRPCE))
        .forEach((p) => p && allPlugins.add(p))

      setupPluginsRunner.call(this, 'transform')
      useConfig(service, {
        actions: {
          handleFile: (context, event) => {
            try {
              const { file: f } = narrowEvent(event, 'EMIT_FILE')
              const file = Object.assign({}, f)

              if (file.type === 'chunk')
                file.fileName = getJsFilename(file.fileName)

              const fileId = this.emitFile(file)
              send(model.events.FILE_ID({ id: file.id, fileId }))

              files.set(fileId, file)
              this.addWatchFile(file.id)
            } catch (error) {
              send(model.events.ERROR(error))
            }
          },
        },
      })

      send(model.events.START())
      await waitFor((state) => {
        if (
          state.matches('error') &&
          state.event.type === 'ERROR'
        )
          throw state.event.error

        return state.matches('ready')
      })
    },

    resolveId(id) {
      if (id === stubId) return id
      return null
    },

    load(id) {
      if (id === stubId) return `console.log('${stubId}')`
      return null
    },

    async generateBundle(options, bundle) {
      delete bundle[stubId + '.js']

      setupPluginsRunner.call(this, 'render')
      useConfig(service, {
        actions: {
          handleFile: (context, event) => {
            try {
              const { fileId, source } = narrowEvent(
                event,
                'COMPLETE_FILE',
              )

              // This is a script, do nothing for now
              if (isUndefined(source)) return

              this.setAssetSource(fileId, source)
              const file = files.get(fileId)!
              file.source = source
            } catch (error) {
              send(model.events.ERROR(error))
            }
          },
        },
      })

      send(model.events.START())
      await waitFor((state) => {
        if (
          state.matches('error') &&
          state.event.type === 'ERROR'
        )
          throw state.event.error

        return state.matches('complete')
      })
    },

    watchChange(id, change) {
      files.clear()
      send(model.events.CHANGE(id, change))
    },
  })
}
