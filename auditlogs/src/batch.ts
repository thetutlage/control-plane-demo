import { uuidv7 } from './uuid.js'
import { createEvent } from './event.js'
import type { Actions, AuditEvent, Store } from './types.js'

/**
 * Events that belong together, such as the ones a single change
 * produces. A batch is made from a scope and carries its context, but
 * the scope keeps no hold on it: only whoever made the batch flushes it,
 * and it never writes by itself. Its events share the batch's ID.
 *
 * Flushing with a store's options is how events are written with a
 * change, for example inside its transaction.
 */
export class Batch<Catalogue extends Actions, Options = unknown> {
  #events: AuditEvent[] = []
  #actions: Catalogue
  #store: Store<Options>
  #context: Record<string, unknown>

  /**
   * On every event recorded through this batch
   */
  id = uuidv7()

  constructor(actions: Catalogue, store: Store<Options>, context: Record<string, unknown>) {
    this.#actions = actions
    this.#store = store
    this.#context = context
  }

  /**
   * How many events it holds
   */
  get size() {
    return this.#events.length
  }

  /**
   * Adds an event for an action from the catalogue, and returns it
   */
  record<Name extends keyof Catalogue & string>(name: Name, ...args: Parameters<Catalogue[Name]>) {
    const event = createEvent(this.#actions, name, args, this.#context, this.id)
    this.#events.push(event)
    return event
  }

  /**
   * Writes the batch's events in one go, passing `options` to the store.
   * Unlike a queue or a collector, a batch throws when the write fails,
   * and keeps its events: a change being saved in the same transaction
   * must fail with it.
   */
  async flush(options?: Options) {
    if (this.#events.length === 0) {
      return
    }

    const events = this.#events
    this.#events = []
    try {
      await this.#store.write(events, options)
    } catch (error) {
      this.#events = [...events, ...this.#events]
      throw error
    }
  }
}
