import { DateTime } from 'luxon'
import { cuid } from '@adonisjs/core/helpers'
import { column, belongsTo, hasMany, beforeCreate } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Table from '#models/table'
import Account from '#models/account'
import OrderItem from '#models/order_item'

import BaseModel from '#models/base'

export default class Order extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tableId: string

  @belongsTo(() => Table)
  declare table: BelongsTo<typeof Table>

  @hasMany(() => OrderItem)
  declare orderItems: HasMany<typeof OrderItem>

  @column()
  declare status: string

  @column()
  declare accountId: string

  @belongsTo(() => Account)
  declare account: BelongsTo<typeof Account>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  public static assignCuid(order: Order) {
    order.id = cuid()
  }
}

