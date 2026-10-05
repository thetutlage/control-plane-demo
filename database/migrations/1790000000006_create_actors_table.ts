import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * An actor is anything that can hold a role or act in an audit event:
 * a member today, an app or an agent later. Actors belong to the
 * organization, so one actor is the same identity in every environment.
 */
export default class extends BaseSchema {
  protected tableName = 'actors'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('organizations.id')
        .onDelete('CASCADE')
      table.tinyint('type').notNullable()

      table.timestamp('created_at', { useTz: true }).notNullable()

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
