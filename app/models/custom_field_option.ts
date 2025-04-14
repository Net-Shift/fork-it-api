import { DateTime } from 'luxon'
import { cuid } from '@adonisjs/core/helpers'
import { column, beforeCreate, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import BaseModel from '#models/base'
import CustomField from '#models/custom_field'


export default class CustomFieldOption extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare label: string

  @column()
  declare value: string | null

  @column()
  declare customFieldId: string

  @belongsTo(() => CustomField)
  declare customField: BelongsTo<typeof CustomField>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  public static assignCuid(CustomFieldOption: CustomFieldOption) {
    CustomFieldOption.id = cuid()
  }
}