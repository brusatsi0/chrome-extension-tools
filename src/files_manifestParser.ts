import glob from 'glob'
import { Observable, of } from 'rxjs'
import { AssetEvent, model } from './files-asset.machine'
import { parseManifest } from './files_parseManifest'
import { join } from './path'
import { Asset, FileType, Manifest } from './types'

function expandMatchPatterns(
  root: string,
): (currentValue: string) => string[] {
  return (x) => {
    if (glob.hasMagic(x)) {
      return glob.sync(x, { cwd: root })
    } else {
      return [x]
    }
  }
}

export function manifestParser(
  root: string,
): (context: Asset) => Observable<AssetEvent> {
  return ({ source }) => {
    try {
      const result = Object.entries(
        parseManifest(source as Manifest),
      ) as [FileType, string[]][]

      const files = result.flatMap(([fileType, fileNames]) =>
        fileNames
          .flatMap(expandMatchPatterns(root))
          .map((fileName) => ({
            fileType,
            fileName,
            id: join(root, fileName),
          })),
      )

      if (files.length === 0)
        throw new Error(
          'Manifest must define at least one entry file',
        )

      return of(model.events.PARSED(files))
    } catch (error) {
      return of(model.events.ERROR(error))
    }
  }
}
