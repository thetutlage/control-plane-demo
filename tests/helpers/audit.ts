import assert from 'node:assert/strict'
import type Organization from '#models/organization'

type Expected = {
  /**
   * Fields the event's data must have, among any others
   */
  data?: Record<string, unknown>

  /**
   * The actor's label, or null for an event by the system
   */
  actor?: string | null

  /**
   * The subjects, as `type: label`, in order
   */
  subjects?: string[]
  summary?: string

  /**
   * How many events of the action there must be. Defaults to at least
   * one.
   */
  count?: number
}

/**
 * An organization's audit events, oldest first, with who and what they
 * involve
 */
export function auditEvents(organization: Organization, action?: string) {
  return organization
    .related('auditEvents')
    .query()
    .if(action, (query) => query.where('action', action!))
    .preload('refs')
    .orderBy('id', 'asc')
}

/**
 * Checks that the organization's audit log has an event of the action
 * matching what is expected, and returns the events of that action
 */
export async function assertRecorded(
  organization: Organization,
  action: string,
  expected: Expected = {}
) {
  const events = await auditEvents(organization, action)
  if (expected.count !== undefined) {
    assert.equal(events.length, expected.count, `Expected ${expected.count} "${action}" event(s)`)
  }
  assert.ok(events.length > 0 || expected.count === 0, `No "${action}" event was recorded`)

  const matches = events.filter((event) => {
    const subjects = event.subjects.map(({ type, label }) => `${type}: ${label}`)
    return (
      (expected.actor === undefined || (event.actor?.label ?? null) === expected.actor) &&
      (expected.summary === undefined || event.summary === expected.summary) &&
      (expected.subjects === undefined ||
        JSON.stringify(subjects) === JSON.stringify(expected.subjects)) &&
      Object.entries(expected.data ?? {}).every(
        ([key, value]) => JSON.stringify(event.data[key]) === JSON.stringify(value)
      )
    )
  })
  if (expected.count !== 0) {
    assert.ok(
      matches.length > 0,
      `No "${action}" event matched ${JSON.stringify(expected)}. Recorded: ${JSON.stringify(
        events.map((event) => ({
          summary: event.summary,
          actor: event.actor?.label ?? null,
          subjects: event.subjects.map(({ type, label }) => `${type}: ${label}`),
          data: event.data,
        }))
      )}`
    )
  }
  return events
}
