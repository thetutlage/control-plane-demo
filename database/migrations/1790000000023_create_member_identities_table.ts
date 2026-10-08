import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Ties a member to their account at the organization's identity provider,
 * by the provider's permanent ID for them (the `sub` of its ID tokens).
 * After the first sign-in, a member is found by this ID and never by
 * email, which can change or be given to someone else. A member has one
 * identity per provider, and an ID belongs to one member.
 */
export default class extends BaseSchema {
  protected tableName = 'member_identities'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('organizations.id')
        .onDelete('CASCADE')
      table
        .integer('identity_provider_id')
        .unsigned()
        .notNullable()
        .references('identity_providers.id')
        .onDelete('CASCADE')
      table
        .integer('member_id')
        .unsigned()
        .notNullable()
        .references('members.id')
        .onDelete('CASCADE')
      table.string('subject').notNullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['identity_provider_id', 'subject'])
      table.unique(['identity_provider_id', 'member_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
