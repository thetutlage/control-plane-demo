import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Append-only log of console actions taken by an organization's users.
 * Tagged with the environment when the action targets one. Each
 * organization's events form a hash chain.
 */
export default class extends BaseSchema {
  protected tableName = 'admin_audit_events'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id')
      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('organizations.id')
        .onDelete('CASCADE')
      table.integer('environment_id').unsigned().nullable()
      table.integer('actor_user_id').unsigned().nullable()
      table.string('actor_label').nullable()
      table.string('action', 128).notNullable()
      table.string('target_type', 64).nullable()
      table.string('target_id', 64).nullable()
      table.string('ip', 45).nullable()
      table.text('user_agent').nullable()
      table.jsonb('metadata').notNullable().defaultTo('{}')
      table.string('prev_hash', 64).nullable()
      table.string('hash', 64).notNullable()

      table.timestamp('created_at', { useTz: true }).notNullable()

      table.index(['organization_id', 'created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
