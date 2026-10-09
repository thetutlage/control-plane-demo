import { AuditEventRefSchema } from '#database/schema'

/**
 * Something an audit event involves: its actor, or one of its subjects,
 * with the name it had then. It points at nothing, so it stays when the
 * member, app or role it names is gone. Rows are written by the audit
 * store and only read here.
 */
export default class AuditEventRef extends AuditEventRefSchema {
  /**
   * The table's key is the event and the position together. Rows are
   * never saved through the model, so the event's ID is enough for
   * Lucid to load them by.
   */
  static primaryKey = 'eventId'
}
