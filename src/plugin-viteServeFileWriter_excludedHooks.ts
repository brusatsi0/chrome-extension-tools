import { Plugin as VitePlugin } from 'vite'
import { RPCEHooks, RPCEPlugin } from './types'

// Creates an exhaustive list of RPCEHooks
const rpceHookRecord: Record<keyof RPCEHooks, 0> = {
  renderCrxCss: 0,
  renderCrxHtml: 0,
  renderCrxImage: 0,
  renderCrxJson: 0,
  renderCrxManifest: 0,
  renderCrxRaw: 0,
  transformCrxCss: 0,
  transformCrxHtml: 0,
  transformCrxImage: 0,
  transformCrxJson: 0,
  transformCrxManifest: 0,
  transformCrxRaw: 0,
}
// RPCE will run these hooks
const rpceHooks = Object.keys(rpceHookRecord)
// These hooks should run on the ViteDevServer
const serverHooks: (keyof VitePlugin | symbol)[] = [
  'config',
  'configResolved',
  'configureServer',
  'resolveId',
  'load',
  'transform',
  'buildEnd',
  'closeBundle',
]

export const excludedHooks = [
  ...serverHooks,
  ...rpceHooks,
] as (keyof RPCEPlugin)[]
