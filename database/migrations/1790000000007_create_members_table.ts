import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Members are the staff who sign in to an organization's internal apps.
 * Each environment has its own members, so the same person has a separate
 * member record in staging and in production.
 */
export default class extends BaseSchema {
  protected tableName = 'members'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('organization_id').unsigned().notNullable()
      table.integer('environment_id').unsigned().notNullable()
      table.integer('actor_id').unsigned().notNullable().unique()
      table.string('full_name').nullable()
      table.string('email', 254).notNullable()
      table.string('password').nullable()
      table.tinyint('status').notNullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['environment_id', 'email'])
      table.index(['organization_id', 'environment_id'])
      table
        .foreign(['organization_id', 'environment_id'])
        .references(['organization_id', 'id'])
        .inTable('environments')
        .onDelete('CASCADE')
      table
        .foreign(['environment_id', 'actor_id'])
        .references(['environment_id', 'id'])
        .inTable('actors')
        .onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
