import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * One sign-in of a member to one app ("Sara is signed in to Invoices"), with
 * what it allows. Authorization codes and refresh tokens belong to a grant,
 * and deleting the grant deletes them. `payload` is the record as
 * oidc-provider stores it; `actor_id` and `client_id` are copied out of it
 * for lookups.
 */
export default class extends BaseSchema {
  protected tableName = 'oidc_grants'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 128).primary()
      table.integer('organization_id').unsigned().notNullable()
      table.integer('environment_id').unsigned().notNullable()
      table.integer('actor_id').unsigned().notNullable()
      table.string('client_id', 64).notNullable()
      table.jsonb('payload').notNullable()
      table.timestamp('expires_at', { useTz: true }).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      /**
       * Target of composite foreign keys that pin a row to one environment
       */
      table.unique(['environment_id', 'id'])

      table.index(['environment_id', 'actor_id'])
      table.index(['organization_id', 'environment_id'])
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
        .foreign(['environment_id', 'client_id'])
        .references(['environment_id', 'client_id'])
        .inTable('app_environments')
        .onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
