import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'custom_fields'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').notNullable().primary()
      table.string('name').notNullable()
      table.string('label').nullable()
      table.string('default_value').nullable()
      table.string('field_type').nullable()
      table.string('target_model').nullable()
      table.string('account_id').unsigned().references('id').inTable('accounts').onDelete('CASCADE')

      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.timestamp('updated_at').nullable()

      table.index(['label'], 'idx_custom_fields_label')
      table.index(['account_id'], 'idx_custom_fields_account_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}