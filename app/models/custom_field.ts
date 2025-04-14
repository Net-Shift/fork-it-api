import { DateTime } from 'luxon'
import { cuid } from '@adonisjs/core/helpers'
import { column, beforeCreate, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import BaseModel from '#models/base'
import Account from '#models/account'
import CustomFieldOption from '#models/custom_field_option'

export enum CustomFieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  BOOLEAN = 'boolean',
  SELECT = 'select',
  MULTI_SELECT = 'multiselect'
}

export default class CustomField extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare label: string | null

  @column()
  declare defaultValue: string | null

  @column()
  declare fieldType: CustomFieldType

  @column()
  declare targetModel: string

  @hasMany(() => CustomFieldOption)
  declare options: HasMany<typeof CustomFieldOption>

  @column()
  declare accountId: string

  @belongsTo(() => Account)
  declare account: BelongsTo<typeof Account>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  public static assignCuid(customField: CustomField) {
    customField.id = cuid()
  }
}