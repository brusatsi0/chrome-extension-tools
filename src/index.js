import htmlInputs from './html-inputs/index'
import manifestInput from './manifest-input/index'

// const release = (value = true) =>
//   process.env.RELEASE === 'true' && value

// export default ({ zipDir = 'releases', pkg } = {}) => [
//   manifest({ pkg }),
//   htmlInputs(),
//   release(zip({ dir: zipDir })),
//   emptyOutputDir(),
// ]

export default opts => {
  const manifest = manifestInput(opts)
  const html = htmlInputs(opts)
  const plugins = [manifest, html]

  return {
    name: 'chrome-extension',

    options(options) {
      const result = plugins.reduce(
        (o, p) => (p.options ? p.options.call(this, o) : o),
        options,
      )

      // chrome extension options hook
      return result
    },

    buildStart(options) {
      manifest.buildStart.call(this, options)
    },

    transform(...args) {
      return manifest.transform.call(this, ...args)
    },

    renderChunk(...args) {
      return manifest.renderChunk.call(this, ...args)
    },

    async generateBundle(...args) {
      const hook = 'generateBundle'

      await Promise.all([
        manifest[hook].call(this, ...args),
        html[hook].call(this, ...args),
      ])
    },
  }
}
