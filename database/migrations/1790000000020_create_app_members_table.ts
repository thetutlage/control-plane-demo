import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Who can sign in to an app in an environment: one row per actor and app,
 * holding one or more roles (`app_member_roles`). No row, no sign-in. The
 * first and last sign-in are kept here too, and stay empty until the
 * member first signs in. Removing the app from the environment removes
 * these rows.
 */
export default class extends BaseSchema {
  protected tableName = 'app_members'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('organization_id').unsigned().notNullable()
      table.integer('environment_id').unsigned().notNullable()
      table.integer('actor_id').unsigned().notNullable()
      table.integer('app_id').unsigned().notNullable()
      table.timestamp('first_signed_in_at', { useTz: true }).nullable()
      table.timestamp('last_signed_in_at', { useTz: true }).nullable()

      table.timestamp('created_at', { useTz: true }).notNullable()

      table.unique(['environment_id', 'actor_id', 'app_id'])

      /**
       * Target of composite foreign keys that pin a row to one environment
       */
      table.unique(['environment_id', 'id'])

      table.index(['environment_id', 'app_id'])
      table
        .foreign(['organization_id', 'environment_id'])
        .references(['organization_id', 'id'])
        .inTable('environments')
        .onDelete('CASCADE')
      table
        .foreign(['organization_id', 'actor_id'])
        .references(['organization_id', 'id'])
        .inTable('actors')
        .onDelete('CASCADE')
      table
        .foreign(['environment_id', 'app_id'])
        .references(['environment_id', 'app_id'])
        .inTable('app_environments')
        .onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
