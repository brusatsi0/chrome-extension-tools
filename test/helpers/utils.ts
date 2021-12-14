import path from 'path'
import { OutputAsset, OutputBundle, OutputChunk } from 'rollup'

export const testDir = path.resolve(__dirname, '..')

/**  Make relative to project root */
export const getRelative = (p: string): string =>
  p.replace(process.cwd() + '/', '')

export function byFileName(n: string) {
  return ({ fileName }: OutputAsset | OutputChunk): boolean =>
    fileName === n
}

/**
 * Get the source of an OutputAsset as a string
 */
export const getAssetSource = (
  key: string,
  bundle: OutputBundle,
): string => {
  const asset = bundle[key] as OutputAsset

  if (!asset) {
    throw new Error(`Unable to find ${key} in bundle`)
  }

  if (asset.source instanceof Uint8Array) {
    return asset.source.toString()
  } else {
    return asset.source
  }
}
