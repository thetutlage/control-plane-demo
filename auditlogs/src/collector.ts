import { consoleReporter } from './reporter.js'
import type { AuditEvent, Reporter, Store, Writer } from './types.js'

export type CollectorOptions = {
  /**
   * Told when a flush could not write, with the events it held
   */
  reporter?: Reporter
}

/**
 * A writer with an end: it holds a scope's events until whoever knows
 * the end flushes it, such as a middleware when the request finishes. It
 * has no timer and never writes by itself.
 */
export class Collector<Options = unknown> implements Writer<Options> {
  #events: AuditEvent[] = []
  #reporter: Reporter

  constructor(
    public store: Store<Options>,
    options: CollectorOptions = {}
  ) {
    this.#reporter = options.reporter ?? consoleReporter
  }

  /**
   * How many events it holds
   */
  get size() {
    return this.#events.length
  }

  add(event: AuditEvent) {
    this.#events.push(event)
  }

  /**
   * Writes what it holds, in one go. It never throws: when the write
   * fails, the events are handed to the reporter and let go of, since
   * whatever the collector was for is over.
   */
  async flush(options?: Options) {
    if (this.#events.length === 0) {
      return
    }

    const events = this.#events
    this.#events = []
    try {
      await this.store.write(events, options)
    } catch (error) {
      this.#reporter(error, events)
    }
  }
}
