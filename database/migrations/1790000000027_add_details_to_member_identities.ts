import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * What an admin sees about a member's account at the identity provider:
 * how the member came to be tied to it, the email the provider last sent
 * for them, and when they last signed in through it. All three are
 * written at sign-in; nothing is fetched from the provider in between.
 */
export default class extends BaseSchema {
  protected tableName = 'member_identities'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.tinyint('origin').notNullable().defaultTo(0)
      table.string('email', 254).nullable()
      table.timestamp('last_signed_in_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('origin')
      table.dropColumn('email')
      table.dropColumn('last_signed_in_at')
    })
  }
}
