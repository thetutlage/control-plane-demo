import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Control plane accounts: the people who sign up and run the console. One
 * account per email, which can belong to many organizations through
 * "user_orgs". These are not the staff of the internal apps, who live per
 * environment in the "members" table.
 */
export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('full_name').nullable()
      table.string('email', 254).notNullable().unique()
      table.string('password').notNullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
