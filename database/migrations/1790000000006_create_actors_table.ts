import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * An actor is anything that can hold a role or act in an audit event:
 * a member today, an app or an agent later.
 */
export default class extends BaseSchema {
  protected tableName = 'actors'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('organization_id').unsigned().notNullable()
      table.integer('environment_id').unsigned().notNullable()
      table.tinyint('type').notNullable()

      table.timestamp('created_at', { useTz: true }).notNullable()

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
