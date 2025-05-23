import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'orders'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('status_id')
      table.string('status').notNullable().defaultTo('draft')
      table.dropColumn('table_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}