import debounce from 'debounce'
import express from 'express'
import { Server } from 'http'
import SocketIO from 'socket.io'
import clientCode from './client.code'
import { PORT } from './CONSTANTS'
import * as handle from './event-handlers'

const name = 'socket-reloader'

const app = express()

export const http = Server(app)
export const io = SocketIO(http)

// NEXT: use ip:port instead of localHost:port
export async function startReloader(options, bundle, cb) {
  io.on('connection', handle.connect)

  http.listen(PORT, function() {
    console.log(`auto-reloader on localhost:${PORT}...`)
  })

  cb(false)

  // TODO: call cb when socket problem

  return io
}

export const reloadClients = debounce(handle.reload, 200)

export const createClientFiles = () => clientCode

export const updateManifest = (manifest, path) => {
  if (!manifest.background) {
    manifest.background = {}
  }

  const { scripts = [] } = manifest.background

  manifest.background.scripts = [...scripts, path]

  manifest.background.persistent = true

  manifest.description =
    'DEVELOPMENT BUILD with auto-reloader script.'
}

export const reloader = {
  name,
  startReloader,
  createClientFiles,
  updateManifest,
  reloadClients,
}
