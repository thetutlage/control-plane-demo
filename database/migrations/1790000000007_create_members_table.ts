import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Members are the staff who sign in to an organization's internal apps. A
 * person is one member in every environment, with one password; which apps
 * they reach is decided per environment.
 */
export default class extends BaseSchema {
  protected tableName = 'members'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('organizations.id')
        .onDelete('CASCADE')
      table.integer('actor_id').unsigned().notNullable().unique()
      table.string('full_name').nullable()
      table.string('email', 254).notNullable()
      table.string('password').nullable()
      table.tinyint('status').notNullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['organization_id', 'email'])
      table
        .foreign(['organization_id', 'actor_id'])
        .references(['organization_id', 'id'])
        .inTable('actors')
        .onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
