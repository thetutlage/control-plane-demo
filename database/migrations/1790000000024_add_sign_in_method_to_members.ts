import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * How a member signs in: with a password, or with the organization's
 * identity provider. An admin sets it, and nothing else changes it. The
 * way that isn't theirs is refused for them.
 */
export default class extends BaseSchema {
  protected tableName = 'members'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.tinyint('sign_in_method').notNullable().defaultTo(0)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('sign_in_method')
    })
  }
}
