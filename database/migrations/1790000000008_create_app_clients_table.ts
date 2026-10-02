import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * An app as configured in one environment: its OAuth client credentials,
 * where it runs and its redirect URIs. The client secret is encrypted with
 * the app key; the hint is its last four characters, for display. The
 * composite foreign keys guarantee the app and the environment belong to the
 * same organization.
 */
export default class extends BaseSchema {
  protected tableName = 'app_clients'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('organization_id').unsigned().notNullable()
      table.integer('environment_id').unsigned().notNullable()
      table.integer('app_id').unsigned().notNullable()
      table.string('client_id', 64).notNullable().unique()
      table.text('client_secret').notNullable()
      table.string('client_secret_hint', 4).notNullable()
      table.string('app_url', 2048).notNullable()
      table.jsonb('redirect_uris').notNullable().defaultTo('[]')

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['environment_id', 'app_id'])

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
      table
        .foreign(['organization_id', 'app_id'])
        .references(['organization_id', 'id'])
        .inTable('apps')
        .onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
