import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'environments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('organizations.id')
        .onDelete('CASCADE')
      table.string('name').notNullable()
      table.string('slug', 48).notNullable()
      table.tinyint('kind').notNullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['organization_id', 'slug'])

      /**
       * Target of the composite foreign key every environment table uses, so
       * a row's organization_id always matches its environment's
       */
      table.unique(['organization_id', 'id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
