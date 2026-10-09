/**
 * A pointer to something an event involves, with its name as it was when
 * the event happened. `type` is the kind of thing (`member`, `app`), and
 * together with `id` it is what a page asks for its events by.
 */
export type Ref<Type extends string = string> = {
  type: Type
  id: string | number
  label: string
}

/**
 * What an action returns: who did it, what it was done to, a sentence
 * saying so, and anything else worth keeping. A null actor means the
 * system did it. Null subjects are dropped, so an action can leave one
 * out with a condition.
 */
export type EventBody = {
  actor: Ref | null
  subjects: (Ref | null | undefined)[]
  summary: string
  data?: Record<string, unknown>
}

/**
 * An event as it is stored. The ID and time are set when the event is
 * created, not when it is written, so writing the same event again
 * carries the same ID and a store can drop the copy.
 */
export type AuditEvent = {
  /**
   * UUID version 7: sorts by the time it was created
   */
  id: string
  occurredAt: Date

  /**
   * The action's name from the catalogue, `category.name`
   */
  action: string
  summary: string
  actor: Ref | null
  subjects: Ref[]
  data: Record<string, unknown>

  /**
   * The context of the scope the event was recorded through, such as the
   * request's ID
   */
  context: Record<string, unknown>

  /**
   * Shared by the events recorded through one batch
   */
  batchId: string | null
}

/**
 * Writes events to one database. `options` come untouched from whoever
 * flushed: a store that can write inside a transaction takes it here.
 * Writing an event the store already has must change nothing.
 *
 * A store only writes. Reading is the app's, through whatever it reads
 * the rest of its data with.
 */
export interface Store<Options = unknown> {
  write(events: AuditEvent[], options?: Options): Promise<void>
}

/**
 * Told when a writer could not write events, with the events. A queue
 * and a collector never throw from a flush: nobody is waiting for the
 * queue's own writes, and a request that has already done its work
 * shouldn't fail on its log. What happens to the events is the
 * reporter's call, such as logging them in full.
 */
export type Reporter = (error: unknown, events: AuditEvent[]) => void

/**
 * Where a scope's events go: a queue or a collector
 */
export interface Writer<Options = unknown> {
  store: Store<Options>
  add(event: AuditEvent): void
  flush(options?: Options): Promise<void>
}

/**
 * The catalogue: every action by name, each a function that builds the
 * event from what it is given
 */
export type Actions = Record<string, (...args: any[]) => EventBody>
