import type { Reporter } from './types.js'

/**
 * Used when a writer is given no reporter, so a failed write is never
 * silent
 */
export const consoleReporter: Reporter = (error, events) => {
  console.error(`[auditlogs] could not write ${events.length} audit event(s)`, error)
}
