import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * An internal app in one environment, with the OAuth client it signs in
 * with: its client ID and secret, where it runs, its redirect URIs, and
 * where members may be sent after signing out. The same app in another
 * environment is a separate row that shares nothing with this one. The
 * client secret is encrypted with the app key; the hint is its last four
 * characters, for display.
 */
export default class extends BaseSchema {
  protected tableName = 'apps'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('organization_id').unsigned().notNullable()
      table.integer('environment_id').unsigned().notNullable()
      table.string('name').notNullable()
      table.string('slug', 48).notNullable()
      table.string('client_id', 64).notNullable().unique()
      table.text('client_secret').notNullable()
      table.string('client_secret_hint', 4).notNullable()
      table.string('app_url', 2048).notNullable()
      table.jsonb('redirect_uris').notNullable().defaultTo('[]')
      table.jsonb('post_logout_redirect_uris').notNullable().defaultTo('[]')

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['environment_id', 'slug'])

      /**
       * Targets of composite foreign keys that pin a row to one environment
       */
      table.unique(['environment_id', 'id'])
      table.unique(['environment_id', 'client_id'])

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
