import vine from '@vinejs/vine'

const baseItemSchema = vine.object({
  name: vine.string().optional(),
  description: vine.string().optional(),
  allergens: vine.array(vine.string()).optional(),
  price: vine.number().optional(),
})

export const createItem = vine.compile(
  vine.object({
    ...baseItemSchema.getProperties()
  })
)

export const updateItem = vine.compile(
  vine.object({
    ...baseItemSchema.getProperties()
  })
)