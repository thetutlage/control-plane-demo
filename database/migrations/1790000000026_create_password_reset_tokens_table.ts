import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * The links members set or reset their password from. Only the hash of a
 * link's token is stored, and a member's links go with the member.
 */
export default class extends BaseSchema {
  protected tableName = 'password_reset_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('tokenable_id')
        .unsigned()
        .notNullable()
        .references('members.id')
        .onDelete('CASCADE')
      table.string('hash', 80).notNullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('expires_at', { useTz: true }).notNullable()

      table.index(['tokenable_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
