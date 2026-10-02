import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Tokens an app uses to get new access tokens. Each use replaces the token
 * with a new one and marks the old one used, so a used token showing up
 * again reveals a copy. `payload` is the record as oidc-provider stores it;
 * `grant_id` is copied out of it, and `consumed_at` is set when the token is
 * used.
 */
export default class extends BaseSchema {
  protected tableName = 'oidc_refresh_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 128).primary()
      table.integer('organization_id').unsigned().notNullable()
      table.integer('environment_id').unsigned().notNullable()
      table.string('grant_id', 128).notNullable()
      table.jsonb('payload').notNullable()
      table.timestamp('expires_at', { useTz: true }).notNullable()
      table.timestamp('consumed_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.index(['environment_id', 'grant_id'])
      table.index(['organization_id', 'environment_id'])
      table
        .foreign(['organization_id', 'environment_id'])
        .references(['organization_id', 'id'])
        .inTable('environments')
        .onDelete('CASCADE')
      table
        .foreign(['environment_id', 'grant_id'])
        .references(['environment_id', 'id'])
        .inTable('oidc_grants')
        .onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
