import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * The roles an app member holds on the app, in its environment. Roles
 * belong to the organization; holding one is per app and environment.
 * Deleting a role takes it away from everyone who held it.
 */
export default class extends BaseSchema {
  protected tableName = 'app_member_roles'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('organization_id').unsigned().notNullable()
      table.integer('environment_id').unsigned().notNullable()
      table.integer('app_member_id').unsigned().notNullable()
      table.integer('role_id').unsigned().notNullable()

      table.timestamp('created_at', { useTz: true }).notNullable()

      table.unique(['app_member_id', 'role_id'])
      table.index(['organization_id', 'role_id'])
      table
        .foreign(['organization_id', 'environment_id'])
        .references(['organization_id', 'id'])
        .inTable('environments')
        .onDelete('CASCADE')
      table
        .foreign(['environment_id', 'app_member_id'])
        .references(['environment_id', 'id'])
        .inTable('app_members')
        .onDelete('CASCADE')
      table
        .foreign(['organization_id', 'role_id'])
        .references(['organization_id', 'id'])
        .inTable('roles')
        .onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
