import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import type { Reporter } from '#auditlogs/index'
import { LucidStore } from '#auditlogs/src/stores/lucid'

/**
 * Where the control plane's audit events are written: the `audit_events`
 * and `audit_event_refs` tables. The organization and environment of an
 * event come from the context of the scope it was recorded through.
 */
export const auditStore = new LucidStore(db.connection(), {
  columns: { organizationId: 'organization_id', environmentId: 'environment_id' },
})

/**
 * Events that could not be written at the end of a request are logged in
 * full, so they can be put back by hand. Events recorded with a change
 * never get here: their batch fails the change instead.
 */
export const reportUnwritten: Reporter = (error, events) => {
  logger.error({ err: error, events }, 'Could not write audit events')
}
