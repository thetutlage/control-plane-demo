import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * The company's own identity provider (Google Workspace, Entra, Okta),
 * which its staff sign in with: the OIDC client the company created
 * there. It belongs to the organization, so every environment's issuer
 * uses the same one. Whoever the provider lets through is staff; it holds
 * no list of email domains. The client secret is encrypted with the app
 * key; the hint is its last four characters, for display.
 *
 * The console lets an organization connect one provider. The table has no
 * unique index on the organization, so a second provider later is another
 * row.
 */
export default class extends BaseSchema {
  protected tableName = 'identity_providers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('organizations.id')
        .onDelete('CASCADE')
      table.tinyint('kind').notNullable()
      table.string('issuer', 2048).notNullable()
      table.string('client_id').notNullable()
      table.text('client_secret').notNullable()
      table.string('client_secret_hint', 4).notNullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.index(['organization_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
