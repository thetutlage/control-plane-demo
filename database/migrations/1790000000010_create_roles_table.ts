import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Roles are built by admins in the console from the keys of the
 * organization's permission catalogue, and can span apps. Every
 * environment uses the same roles.
 */
export default class extends BaseSchema {
  protected tableName = 'roles'

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
      table.text('description').nullable()
      table.jsonb('permissions').notNullable().defaultTo('[]')

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['organization_id', 'name'])

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
