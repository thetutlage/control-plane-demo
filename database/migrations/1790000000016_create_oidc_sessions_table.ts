import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * A member's sign-in to the environment's login page, held in a browser
 * cookie. It is what lets other apps skip the login page (single sign-on).
 * `payload` is the record as oidc-provider stores it; `uid` and
 * `actor_id` are copied out of it for lookups.
 */
export default class extends BaseSchema {
  protected tableName = 'oidc_sessions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 128).primary()
      table.integer('organization_id').unsigned().notNullable()
      table.integer('environment_id').unsigned().notNullable()
      table.string('uid', 128).notNullable()
      table.integer('actor_id').unsigned().nullable()
      table.jsonb('payload').notNullable()
      table.timestamp('expires_at', { useTz: true }).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.unique(['environment_id', 'uid'])
      table.index(['environment_id', 'actor_id'])
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
