import { Batch } from './batch.js'
import { createEvent } from './event.js'
import type { Actions, Writer } from './types.js'

/**
 * Says what events have in common: the process, one request, one job.
 * A scope stamps its context on every event recorded through it and
 * hands the event to its writer. It holds no events, and it never
 * flushes a batch made from it.
 *
 * ```ts
 * const audit = new Scope(actions, new Queue(store), { pid: process.pid })
 * const scope = audit.child(new Collector(store), { requestId })
 * const tenant = scope.with({ organizationId })
 * ```
 */
export class Scope<Catalogue extends Actions, Options = unknown> {
  constructor(
    public actions: Catalogue,
    public writer: Writer<Options>,
    public context: Record<string, unknown> = {}
  ) {}

  /**
   * Records an event for an action from the catalogue, and returns it.
   * When it is written is up to the scope's writer.
   */
  record<Name extends keyof Catalogue & string>(name: Name, ...args: Parameters<Catalogue[Name]>) {
    const event = createEvent(this.actions, name, args, this.context, null)
    this.writer.add(event)
    return event
  }

  /**
   * A batch with this scope's context, written to the same store. Its
   * maker flushes it.
   */
  batch() {
    return new Batch<Catalogue, Options>(this.actions, this.writer.store, this.context)
  }

  /**
   * A scope inside this one, with its own writer and this scope's
   * context plus its own
   */
  child(writer: Writer<Options>, context: Record<string, unknown> = {}) {
    return new Scope<Catalogue, Options>(this.actions, writer, { ...this.context, ...context })
  }

  /**
   * This scope with more context, on the same writer. For context that
   * is only known part-way through, such as the tenant of a request.
   */
  with(context: Record<string, unknown>) {
    return this.child(this.writer, context)
  }

  /**
   * Writes what the scope's writer holds. Batches are not touched.
   */
  flush(options?: Options) {
    return this.writer.flush(options)
  }
}
