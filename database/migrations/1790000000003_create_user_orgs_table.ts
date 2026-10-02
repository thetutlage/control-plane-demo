import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Which organizations a control plane user belongs to.
 */
export default class extends BaseSchema {
  protected tableName = 'user_orgs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE')
      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('organizations.id')
        .onDelete('CASCADE')

      table.timestamp('created_at', { useTz: true }).notNullable()

      table.primary(['user_id', 'organization_id'])
      table.index(['organization_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
