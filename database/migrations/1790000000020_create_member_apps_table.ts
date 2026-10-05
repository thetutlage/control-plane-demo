import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * The apps each member has ever signed in to, with their first and last
 * sign-in. Grants are temporary (they expire and sign-out deletes them), so
 * this is the lasting record. Removing the app removes it too.
 */
export default class extends BaseSchema {
  protected tableName = 'member_apps'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('organization_id').unsigned().notNullable()
      table.integer('environment_id').unsigned().notNullable()
      table.integer('actor_id').unsigned().notNullable()
      table.integer('app_id').unsigned().notNullable()
      table.timestamp('first_signed_in_at', { useTz: true }).notNullable()
      table.timestamp('last_signed_in_at', { useTz: true }).notNullable()

      table.unique(['actor_id', 'app_id'])
      table.index(['environment_id', 'app_id'])
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
      table
        .foreign(['environment_id', 'app_id'])
        .references(['environment_id', 'id'])
        .inTable('apps')
        .onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
