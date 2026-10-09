import { hasMany, scope } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { AuditEventSchema } from '#database/schema'
import AuditEventRef from '#models/audit_event_ref'

type Thing = { type: string; id: string | number }

/**
 * One event in the audit log: an access, sign-in or configuration
 * change (plan §3, "Audit events"). Events are written by the audit
 * store (`auditlogs/src/stores/lucid.ts`) and only read here, through
 * `organization.auditEvents` or `environment.auditEvents`.
 *
 * The ID is a UUID version 7 made when the event happened, so ordering
 * by it is newest first, and it is the cursor for the next page.
 */
export default class AuditEvent extends AuditEventSchema {
  static selfAssignPrimaryKey = true

  /**
   * The actor, then the subjects in the order the action listed them
   */
  @hasMany(() => AuditEventRef, {
    foreignKey: 'eventId',
    onQuery: (query) => query.orderBy('position'),
  })
  declare refs: HasMany<typeof AuditEventRef>

  /**
   * Events the given thing is the actor or a subject of, or only one of
   * the two
   */
  static involving = scope((query, thing: Thing, role?: 'actor' | 'subject') => {
    query.whereIn('id', (refs) => {
      refs
        .from(AuditEventRef.table)
        .select('event_id')
        .where('type', thing.type)
        .where('ref_id', String(thing.id))
        .if(role, (narrowed) => narrowed.where('role', role!))
    })
  })

  /**
   * A page of events, newest first: the ones before `cursor` (the ID of
   * the previous page's last event), and one more than `limit`, which
   * tells the caller whether another page follows
   */
  static page = scope((query, limit: number, cursor?: string | null) => {
    query
      .if(cursor, (older) => older.where('id', '<', cursor!))
      .orderBy('id', 'desc')
      .limit(limit + 1)
  })

  /**
   * Who did it, or null when the system did. Needs `refs` loaded.
   */
  get actor() {
    return this.refs.find(({ role }) => role === 'actor') ?? null
  }

  /**
   * What it was done to. Needs `refs` loaded.
   */
  get subjects() {
    return this.refs.filter(({ role }) => role === 'subject')
  }
}
