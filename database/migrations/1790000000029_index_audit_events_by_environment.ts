import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * The console filters an organization's audit log by environment and pages
 * it newest first. This index serves that read without walking the
 * organization's other events.
 */
export default class extends BaseSchema {
  protected tableName = 'audit_events'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.index(['organization_id', 'environment_id', 'id'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['organization_id', 'environment_id', 'id'])
    })
  }
}
