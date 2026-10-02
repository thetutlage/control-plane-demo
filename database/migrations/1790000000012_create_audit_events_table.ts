import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Append-only runtime audit log of one environment. Actors and targets are
 * stored as snapshots without foreign keys, so the history outlives the
 * records it describes. Each environment's events form a hash chain.
 */
export default class extends BaseSchema {
  protected tableName = 'audit_events'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id')
      table.integer('organization_id').unsigned().notNullable()
      table.integer('environment_id').unsigned().notNullable()
      table.tinyint('actor_type').nullable()
      table.integer('actor_id').unsigned().nullable()
      table.string('actor_label').nullable()
      table.string('action', 128).notNullable()
      table.string('target_type', 64).nullable()
      table.string('target_id', 64).nullable()
      table.integer('app_client_id').unsigned().nullable()
      table.string('ip', 45).nullable()
      table.text('user_agent').nullable()
      table.jsonb('metadata').notNullable().defaultTo('{}')
      table.string('prev_hash', 64).nullable()
      table.string('hash', 64).notNullable()

      table.timestamp('created_at', { useTz: true }).notNullable()

      table.index(['environment_id', 'created_at'])
      table.index(['organization_id', 'created_at'])
      table
        .foreign(['organization_id', 'environment_id'])
        .references(['organization_id', 'id'])
        .inTable('environments')
        .onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
