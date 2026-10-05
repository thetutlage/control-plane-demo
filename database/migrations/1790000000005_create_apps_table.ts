import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * An internal app, registered once for the organization. It moves through
 * the environments: its setup in each one (credentials, URLs) is an
 * `app_environments` row, missing until the app reaches that stage.
 */
export default class extends BaseSchema {
  protected tableName = 'apps'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('organizations.id')
        .onDelete('CASCADE')
      table.string('name').notNullable()
      table.string('slug', 48).notNullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['organization_id', 'slug'])

      /**
       * Target of composite foreign keys that pin a row to one organization
       */
      table.unique(['organization_id', 'id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
