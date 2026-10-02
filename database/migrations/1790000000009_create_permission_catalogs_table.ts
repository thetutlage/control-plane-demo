import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * The company's master permission catalogue for one environment, synced from
 * the company's access repo. It is the source of truth for which permission
 * keys exist; roles that reference a key missing from it are flagged in the
 * console, never rejected.
 */
export default class extends BaseSchema {
  protected tableName = 'permission_catalogs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('organization_id').unsigned().notNullable()
      table.integer('environment_id').unsigned().notNullable().unique()
      table.jsonb('permissions').notNullable().defaultTo('{}')
      table.string('hash', 64).nullable()
      table.string('git_sha', 64).nullable()
      table.timestamp('synced_at', { useTz: true }).nullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.index(['organization_id', 'environment_id'])
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
