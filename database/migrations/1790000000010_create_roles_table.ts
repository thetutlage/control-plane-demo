import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Roles are built by admins in the console from the keys of the
 * environment's permission catalogue, and can span apps. They exist only in
 * the environment they were created in.
 */
export default class extends BaseSchema {
  protected tableName = 'roles'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('organization_id').unsigned().notNullable()
      table.integer('environment_id').unsigned().notNullable()
      table.string('name').notNullable()
      table.text('description').nullable()
      table.jsonb('permissions').notNullable().defaultTo('[]')

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['environment_id', 'name'])

      /**
       * Target of composite foreign keys that pin a row to one environment
       */
      table.unique(['environment_id', 'id'])

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
