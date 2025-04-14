import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'custom_field_values'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').notNullable().primary()
      table.text('value').nullable()
      table.string('target_id').notNullable()
      table.string('custom_field_id').unsigned().references('id').inTable('custom_fields').onDelete('CASCADE')

      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.timestamp('updated_at').nullable()
      
      table.index(['target_id'], 'idx_custom_field_values_target_id')
      table.index(['custom_field_id'], 'idx_custom_field_values_custom_field_id')
      table.index(['value'], 'idx_custom_field_values_value')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}