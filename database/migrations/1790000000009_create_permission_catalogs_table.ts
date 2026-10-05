import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * The company's master permission catalogue, synced from the company's
 * access repo and used by every environment. It is the source of truth for
 * which permission keys exist; roles that reference a key missing from it
 * are flagged in the console, never rejected.
 */
export default class extends BaseSchema {
  protected tableName = 'permission_catalogs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .unique()
        .references('organizations.id')
        .onDelete('CASCADE')
      table.jsonb('permissions').notNullable().defaultTo('{}')
      table.string('hash', 64).nullable()
      table.string('git_sha', 64).nullable()
      table.timestamp('synced_at', { useTz: true }).nullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
