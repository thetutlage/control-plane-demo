import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Grants a role to an actor. Both composite foreign keys include the
 * environment, so a staging member can never hold a production role.
 */
export default class extends BaseSchema {
  protected tableName = 'role_assignments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('organization_id').unsigned().notNullable()
      table.integer('environment_id').unsigned().notNullable()
      table.integer('role_id').unsigned().notNullable()
      table.integer('actor_id').unsigned().notNullable()
      table.timestamp('expires_at', { useTz: true }).nullable()

      table.timestamp('created_at', { useTz: true }).notNullable()

      table.unique(['role_id', 'actor_id'])
      table.index(['organization_id', 'environment_id'])
      table
        .foreign(['organization_id', 'environment_id'])
        .references(['organization_id', 'id'])
        .inTable('environments')
        .onDelete('CASCADE')
      table
        .foreign(['environment_id', 'role_id'])
        .references(['environment_id', 'id'])
        .inTable('roles')
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
