import type { AuditEvent, Store } from '../types.js'

/**
 * Keeps events in memory, for tests, which read `events` directly. It
 * drops an event it already has, as every store must, and remembers
 * each write with the options it was given.
 */
export class MemoryStore<Options = unknown> implements Store<Options> {
  events: AuditEvent[] = []
  writes: { events: AuditEvent[]; options: Options | undefined }[] = []

  /**
   * The next write fails with this error, once
   */
  failNextWriteWith: Error | null = null

  async write(events: AuditEvent[], options?: Options) {
    if (this.failNextWriteWith) {
      const error = this.failNextWriteWith
      this.failNextWriteWith = null
      throw error
    }

    this.writes.push({ events, options })
    for (const event of events) {
      if (!this.events.some(({ id }) => id === event.id)) {
        this.events.push(event)
      }
    }
  }
}
