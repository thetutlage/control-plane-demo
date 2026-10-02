import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Sign-ins in progress: which app sent the member and where to send them
 * back, kept while they are on the login page. `payload` is the record as
 * oidc-provider stores it.
 */
export default class extends BaseSchema {
  protected tableName = 'oidc_interactions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 128).primary()
      table.integer('organization_id').unsigned().notNullable()
      table.integer('environment_id').unsigned().notNullable()
      table.jsonb('payload').notNullable()
      table.timestamp('expires_at', { useTz: true }).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

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
