import { uuidv7 } from './uuid.js'
import type { Actions, AuditEvent } from './types.js'

/**
 * Builds the event for an action: the catalogue's function says what
 * happened, and the ID and time are set here, at once.
 */
export function createEvent<Catalogue extends Actions, Name extends keyof Catalogue & string>(
  actions: Catalogue,
  name: Name,
  args: Parameters<Catalogue[Name]>,
  context: Record<string, unknown>,
  batchId: string | null
): AuditEvent {
  const action = actions[name]
  if (!action) {
    throw new Error(`Unknown audit action "${name}"`)
  }

  const body = action(...args)
  return {
    id: uuidv7(),
    occurredAt: new Date(),
    action: name,
    summary: body.summary,
    actor: body.actor,
    subjects: body.subjects.filter((subject) => subject !== null && subject !== undefined),
    data: body.data ?? {},
    context: { ...context },
    batchId,
  }
}
