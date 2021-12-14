import {
  EventObject,
  interpret,
  Interpreter,
  InterpreterOptions,
  MachineOptions,
  State,
  StateConfig,
  StateMachine,
  Subscription,
  Typestate,
} from 'xstate'

export type MaybeLazy<T> = T | (() => T)

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

export function useMachine<
  TContext,
  TEvent extends EventObject,
  TTypestate extends Typestate<TContext> = {
    value: any
    context: TContext
  },
>(
  getMachine: MaybeLazy<
    StateMachine<TContext, any, TEvent, TTypestate>
  >,
  options: Partial<InterpreterOptions> &
    Partial<UseMachineOptions<TContext, TEvent>> &
    Partial<MachineOptions<TContext, TEvent>> = {},
): {
  send: Interpreter<TContext, any, TEvent, TTypestate>['send']
  service: Interpreter<TContext, any, TEvent, TTypestate>
  waitFor: (
    matcher: (
      state: State<TContext, TEvent, any, TTypestate>,
    ) => boolean,
    options?: {
      multipleMatchers?: boolean | undefined
    },
  ) => Promise<State<TContext, TEvent, any, TTypestate>>
} {
  const machine =
    typeof getMachine === 'function' ? getMachine() : getMachine

  const {
    context,
    guards,
    actions,
    activities,
    services,
    delays,
    state: rehydratedState,
    ...interpreterOptions
  } = options

  const machineConfig = {
    context,
    guards,
    actions,
    activities,
    services,
    delays,
  }

  const machineWithConfig = machine.withConfig(machineConfig, {
    ...machine.context,
    ...context,
  })

  const service = interpret(machineWithConfig, {
    deferEvents: true,
    ...interpreterOptions,
  })
  service.start()

  const matchSubs = new Set<Subscription>()
  const waitFor = (
    matcher: (
      state: State<TContext, TEvent, any, TTypestate>,
    ) => boolean,
    options = {} as {
      /** Default: false; If true, other matchers will stay active after this one resolves */
      multipleMatchers?: boolean
    },
  ): Promise<State<TContext, TEvent, any, TTypestate>> =>
    new Promise((resolve, reject) => {
      const sub = service.subscribe({
        next: (state) => {
          if (!matcher(state)) return

          if (options.multipleMatchers) {
            sub.unsubscribe()
            matchSubs.delete(sub)
          } else {
            matchSubs.forEach((sub) => sub.unsubscribe())
            matchSubs.clear()
          }

          resolve(state)
        },
        error: (error) => reject(error),
        complete: () =>
          reject(new Error(`${service.id} has stopped`)),
      })

      matchSubs.add(sub)
    })

  return { send: service.send, waitFor, service }
}
