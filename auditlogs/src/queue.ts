import { consoleReporter } from './reporter.js'
import type { AuditEvent, Reporter, Store, Writer } from './types.js'

export type QueueOptions = {
  /**
   * Writes once it holds this many events. Defaults to 20.
   */
  flushAt?: number

  /**
   * Writes this many milliseconds after the first event it holds, at the
   * latest. Defaults to 5000.
   */
  flushInterval?: number

  /**
   * The most events it holds while writes keep failing. Past it, the
   * oldest are handed to the reporter and let go of. Defaults to 10000.
   */
  maxSize?: number

  /**
   * Told when a write fails, with the events it tried to write. They
   * stay in the queue and go out with the next write.
   */
  reporter?: Reporter
}

/**
 * A writer that lives as long as the process and writes what it sees by
 * its own rules: at a size, after an interval, and when closed. It is
 * the only unit with such rules. Events it holds when the process dies
 * are lost, so it is for events that can afford that.
 */
export class Queue<Options = unknown> implements Writer<Options> {
  #events: AuditEvent[] = []
  #timer: NodeJS.Timeout | null = null
  #flushAt: number
  #flushInterval: number
  #maxSize: number
  #reporter: Reporter

  constructor(
    public store: Store<Options>,
    options: QueueOptions = {}
  ) {
    this.#flushAt = options.flushAt ?? 20
    this.#flushInterval = options.flushInterval ?? 5000
    this.#maxSize = options.maxSize ?? 10_000
    this.#reporter = options.reporter ?? consoleReporter
  }

  /**
   * How many events are waiting to be written
   */
  get size() {
    return this.#events.length
  }

  add(event: AuditEvent) {
    this.#events.push(event)

    if (this.#events.length > this.#maxSize) {
      const dropped = this.#events.splice(0, this.#events.length - this.#maxSize)
      this.#reporter(new Error('The audit queue is full; its oldest events were dropped'), dropped)
    }

    if (this.#events.length >= this.#flushAt) {
      void this.flush()
      return
    }

    /**
     * The timer doesn't keep the process alive: on a clean exit, `close`
     * writes what is left
     */
    this.#timer ??= setTimeout(() => void this.flush(), this.#flushInterval).unref()
  }

  /**
   * Writes what is waiting now, without waiting for the rules. It never
   * throws: when the write fails, the reporter is told and the events go
   * back to the front of the queue for the next write.
   */
  async flush(options?: Options) {
    if (this.#timer) {
      clearTimeout(this.#timer)
      this.#timer = null
    }
    if (this.#events.length === 0) {
      return
    }

    const events = this.#events
    this.#events = []
    try {
      await this.store.write(events, options)
    } catch (error) {
      this.#events = [...events, ...this.#events]
      this.#reporter(error, events)
    }
  }

  /**
   * Writes what is left. Call it when the process shuts down.
   */
  close() {
    return this.flush()
  }
}
