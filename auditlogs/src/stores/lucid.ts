import type { QueryClientContract } from '@adonisjs/lucid/types/database'
import { categoryOf } from '../define.js'
import type { AuditEvent, Ref, Store } from '../types.js'

export type LucidStoreOptions = {
  /**
   * The client to write on. Pass a transaction to write events with the
   * change they describe: they are saved if it commits and gone if it
   * rolls back.
   */
  client?: QueryClientContract
}

export type LucidStoreConfig = {
  /**
   * Context keys kept in columns of their own on the events table, as
   * `{ contextKey: 'column_name' }`. They usually name the tenant, which
   * the app reads events by. The rest of the context is stored as JSON.
   */
  columns?: Record<string, string>

  /**
   * Table names, when they differ from `audit_events` and
   * `audit_event_refs`
   */
  tables?: { events?: string; refs?: string }
}

/**
 * Writes events to a SQL database through Lucid, in two tables: one row
 * per event, and one row per thing the event involves (its actor, then
 * each subject), which is what pages look their events up by. See the
 * app's migration for the shape, and its models for reading.
 */
export class LucidStore implements Store<LucidStoreOptions> {
  #db: QueryClientContract
  #columns: [contextKey: string, column: string][]
  #events: string
  #refs: string

  constructor(db: QueryClientContract, config: LucidStoreConfig = {}) {
    this.#db = db
    this.#columns = Object.entries(config.columns ?? {})
    this.#events = config.tables?.events ?? 'audit_events'
    this.#refs = config.tables?.refs ?? 'audit_event_refs'
  }

  /**
   * The context values that have columns of their own, by column
   */
  #columnValues(context: Record<string, unknown>) {
    return Object.fromEntries(this.#columns.map(([key, column]) => [column, context[key] ?? null]))
  }

  /**
   * Inserts the events, then the refs of the ones that were new. An
   * event the table already has is skipped with its refs, so writing a
   * batch again changes nothing.
   */
  async write(events: AuditEvent[], options: LucidStoreOptions = {}) {
    if (events.length === 0) {
      return
    }
    const client = options.client ?? this.#db
    const promoted = new Set(this.#columns.map(([key]) => key))

    const insert = client.insertQuery<{ id: string }>().table(this.#events).returning('id')
    insert.knexQuery.onConflict('id').ignore()
    const inserted = await insert.multiInsert(
      events.map((event) => ({
        id: event.id,
        occurred_at: event.occurredAt,
        action: event.action,
        category: categoryOf(event.action),
        summary: event.summary,
        data: JSON.stringify(event.data),
        context: JSON.stringify(
          Object.fromEntries(Object.entries(event.context).filter(([key]) => !promoted.has(key)))
        ),
        batch_id: event.batchId,
        ...this.#columnValues(event.context),
      }))
    )

    const fresh = new Set(inserted.map(({ id }) => id))
    const refs = events
      .filter((event) => fresh.has(event.id))
      .flatMap((event) => {
        const row = (ref: Ref, role: string, position: number) => ({
          event_id: event.id,
          position,
          role,
          type: ref.type,
          ref_id: String(ref.id),
          label: ref.label,
        })

        return [
          ...(event.actor ? [row(event.actor, 'actor', 0)] : []),
          ...event.subjects.map((subject, index) => row(subject, 'subject', index + 1)),
        ]
      })
    if (refs.length > 0) {
      await client.insertQuery().table(this.#refs).multiInsert(refs)
    }
  }
}
