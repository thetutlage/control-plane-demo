import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Keys an environment's issuer signs ID and access tokens with. Apps fetch
 * the public halves from the environment's JWKS endpoint. The private JWK is
 * encrypted with the app key.
 */
export default class extends BaseSchema {
  protected tableName = 'signing_keys'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('organization_id').unsigned().notNullable()
      table.integer('environment_id').unsigned().notNullable()
      table.string('kid', 64).notNullable().unique()
      table.string('alg', 16).notNullable()
      table.text('private_jwk').notNullable()

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
