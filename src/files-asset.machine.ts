import { of } from 'rxjs'
import { assign, EventFrom, sendParent } from 'xstate'
import { createModel } from 'xstate/lib/model'
import { isUndefined } from './helpers'
import { Asset } from './types'
import { narrowEvent } from './files_helpers'
import { sharedEventCreators } from './files.sharedEvents'

export const model = createModel({} as Asset, {
  events: {
    PARSED: () => ({}),
    LOADED: (values: Pick<Asset, 'id' | 'source'>) => values,
    ...sharedEventCreators,
  },
})

export type AssetEvent = EventFrom<typeof model>

/**
 * This machine uses services that are file type specific
 * and must be added when the machine is spawned.
 *
 * All services may emit an ERROR event
 *
 * Required services:
 *   - "loader": should emit LOADED events, may emit ROOT event
 *   - "parser": should emit ADD_FILE events
 */
export const assetMachine = model.createMachine(
  {
    context: model.initialContext,
    on: {
      ERROR: { actions: 'forwardToParent', target: '#error' },
    },
    initial: 'loading',
    states: {
      changed: {
        on: { START: 'loading' },
      },
      loading: {
        invoke: { src: 'loader' },
        on: {
          LOADED: {
            actions: 'updateContext',
            target: 'transforming',
          },
        },
      },
      transforming: {
        entry: 'startPluginTransform',
        on: {
          PLUGINS_RESULT: {
            actions: 'updateContext',
            target: 'parsing',
          },
        },
      },
      parsing: {
        invoke: { src: 'parser' },
        on: {
          ADD_FILE: { actions: 'forwardToParent' },
          PARSED: [
            {
              cond: ({ fileType }) => fileType === 'MANIFEST',
              target: 'ready',
            },
            { target: 'rendering' },
          ],
        },
      },
      ready: {
        on: { START: 'rendering' },
      },
      rendering: {
        entry: 'startPluginRender',
        on: {
          PLUGINS_RESULT: {
            actions: 'sendFileToParent',
            target: 'complete',
          },
        },
      },
      complete: {
        on: {
          CHANGE: [
            {
              cond: ({ id }, { id: changedId }) =>
                id === changedId,
              target: 'changed',
            },
            'ready',
          ],
        },
      },
      error: {
        id: 'error',
        entry: 'forwardToParent',
        type: 'final',
      },
    },
  },
  {
    actions: {
      forwardToParent: sendParent((context, event) => event),
      sendFileToParent: sendParent((context, event) => {
        const { type, ...result } = narrowEvent(
          event,
          'PLUGINS_RESULT',
        )

        if (isUndefined(result.source))
          throw new TypeError('Output file source is undefined')

        let source: string | Uint8Array
        if (
          result.fileType === 'JSON' ||
          result.fileType === 'MANIFEST'
        ) {
          source = JSON.stringify(result.source)
        } else {
          source = result.source
        }

        return model.events.FILE_DONE({
          ...result,
          source,
          type: 'asset',
        })
      }),
      startPluginTransform: sendParent((context) =>
        model.events.PLUGINS_START({
          ...context,
          hook: 'transform',
        }),
      ),
      startPluginRender: sendParent((context) =>
        model.events.PLUGINS_START({
          ...context,
          hook: 'render',
        }),
      ),
      // @ts-expect-error It's the same
      updateContext: assign(({ id, ...context }, event) => {
        const {
          type,
          id: resultId,
          ...result
        } = narrowEvent(event, ['PLUGINS_RESULT', 'LOADED'])

        if (id === resultId)
          return {
            ...context,
            ...result,
          }

        return context
      }),
    },
    services: {
      loader: ({ id }) =>
        of(
          model.events.ERROR(
            new Error(
              `service "loader" is not defined on "${id}"`,
            ),
          ),
        ),
      parser: ({ id }) =>
        of(
          model.events.ERROR(
            new Error(
              `service "parser" is not defined on "${id}"`,
            ),
          ),
        ),
    },
  },
)
