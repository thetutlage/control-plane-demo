import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Whether people the provider lets through, whom no admin added, become
 * members on their first sign-in. Off unless an admin turns it on.
 */
export default class extends BaseSchema {
  protected tableName = 'identity_providers'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('admits_newcomers').notNullable().defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('admits_newcomers')
    })
  }
}
