import vine from '@vinejs/vine'
import { CustomFieldType } from '#models/custom_field'

export const createCustomField = vine.compile(
  vine.object({
    name: vine
      .string()
      .unique(async (query, field, value) => {
        const customField = await query.from('custom_fields').where('name', field).andWhere('target_model', value.data.targetModel).first()
        return !customField
      }),
    label: vine
      .string()
      .unique(async (query, field, value) => {
        const customField = await query.from('custom_fields').where('label', field).andWhere('target_model', value.data.targetModel).first()
        return !customField
      }),
    defaultValue: vine.string().optional(),
    fieldType: vine.enum(Object.values(CustomFieldType)),
    targetModel: vine.enum(['items', 'orders', 'rooms', 'tables', 'users']),
    options: vine.array(vine.object({ label: vine.string(), value: vine.string() })).optional()
  })
)

export const updateCustomField = vine.compile(
  vine.object({
    name: vine
      .string()
      .unique(async (query, field, value) => {
        const customField = await query.from('custom_fields').where('name', field).whereNot('id', value.parent.id).andWhere('target_model', value.data.targetModel).first()
        return !customField
      }).optional(),
    label: vine
      .string()
      .unique(async (query, field, value) => {
        const customField = await query.from('custom_fields').where('label', field).whereNot('id', value.parent.id).andWhere('target_model', value.data.targetModel).first()
        return !customField
      }).optional(),
    defaultValue: vine.string().optional(),
    fieldType: vine.enum(Object.values(CustomFieldType)).optional(),
    targetModel: vine.enum(['items', 'orders', 'rooms', 'tables', 'users']).optional(),
    options: vine.array(vine.object({ label: vine.string(), value: vine.string() })).optional()
  })
)