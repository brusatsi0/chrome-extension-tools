import {
  EventObject,
  ExtractEvent,
  Interpreter,
  MachineOptions,
  State,
  StateConfig,
  Typestate,
} from 'xstate'

export function narrowEvent<
  TEvent extends EventObject,
  TEventType extends TEvent['type'],
>(
  event: TEvent,
  type: TEventType,
): ExtractEvent<TEvent, TEventType>
export function narrowEvent<
  TEvent extends EventObject,
  TEventType extends TEvent['type'],
>(
  event: TEvent,
  type: TEventType[],
): ExtractEvent<TEvent, TEventType>
export function narrowEvent<TEvent extends EventObject>(
  event: TEvent,
  types: string | string[],
): EventObject {
  types = Array.isArray(types) ? types : [types]
  if (!types.includes(event.type)) {
    throw new Error(
      `Expected event${
        types.length > 1 ? 's' : ''
      } "${types.join(', ')}" but got "${event.type}".`,
    )
  }

  return event
}

export interface UseMachineOptions<
  TContext,
  TEvent extends EventObject,
> {
  /**
   * If provided, will be merged with machine's `context`.
   */
  context?: Partial<TContext>
  /**
   * The state to rehydrate the machine to. The machine will
   * start at this state instead of its `initialState`.
   */
  state?: StateConfig<TContext, TEvent>
}

export const useConfig = <TContext, TEvent extends EventObject>(
  service: Interpreter<TContext, any, TEvent, any>,
  options: Partial<MachineOptions<TContext, TEvent>> = {},
): void => {
  const { guards, actions, activities, services, delays } =
    options

  Object.assign(service.machine.options.actions, actions)
  Object.assign(service.machine.options.guards, guards)
  Object.assign(service.machine.options.activities, activities)
  Object.assign(service.machine.options.services, services)
  Object.assign(service.machine.options.delays, delays)
}

export const waitForState = <
  TContext,
  TEvent extends EventObject,
  TTypestate extends Typestate<TContext> = {
    value: any
    context: TContext
  },
>(
  service: Interpreter<TContext, any, TEvent, any>,
  matcher: (
    state: State<TContext, TEvent, any, TTypestate>,
  ) => boolean,
): Promise<State<TContext, TEvent, any, TTypestate>> =>
  new Promise((resolve, reject) => {
    const sub = service.subscribe({
      next: (state) => {
        try {
          if (!matcher(state)) return

          resolve(state)
          sub.unsubscribe()
        } catch (error) {
          reject(error)
          sub.unsubscribe()
        }
      },
      error: (error) => {
        reject(error)
      },
      complete: () => {
        reject(new Error(`${service.id} has stopped`))
      },
    })
  })

// export function debugHelper<
//   TContext,
//   TEvent extends EventObject,
// >(
//   service:
//     | Interpreter<TContext, any, TEvent>
//     | ActorRef<any, any>,
//   subscriber: (
//     state: State<any, EventObject>,
//     parentIds: string[],
//     actors: Map<any, string[]>,
//   ) => void,
//   { actors, ids: pids } = {
//     actors: new Map<any, string[]>(),
//     ids: [] as string[],
//   },
// ): void {
//   const ids = pids.length > 0 ? pids : [service.id]
//   actors.set(service, ids)

//   service.subscribe((state) => {
//     subscriber(state, ids, actors)

//     if (state?.children)
//       Object.entries(
//         state.children as Record<
//           string,
//           ActorRef<EventObject, unknown>
//         >,
//       ).forEach(([id, ref]) => {
//         if (actors.has(ref)) return

//         debugHelper(ref, subscriber, {
//           actors,
//           ids: [...ids, id],
//         })
//       })
//   })
// }

// export function logActorStates(
//   actors: Map<any, string[]>,
//   filename?: string,
// ) {
//   const actorStates = Array.from(actors).reduce(
//     (r, [actor, ids]) => {
//       const snap = actor.getSnapshot()
//       if (!snap?.value) return r
//       return format`
//         ${r}
//         ${ids
//           .map((id) => id.replace(process.cwd() + '/', ''))
//           .join(' -> ')} :: ${JSON.stringify(snap.value)} ${
//         snap.context.fileId ?? ''
//       }`
//     },
//     '',
//   )

//   writeFileSync(
//     filename ?? join(process.cwd(), 'actorStates.log'),
//     actorStates,
//   )
// }
