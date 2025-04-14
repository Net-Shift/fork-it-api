import type { HttpContext } from '@adonisjs/core/http'
import Item from '#models/item'
import CustomField from '#models/custom_field'
import { createItem, updateItem } from '#validators/item'
import BaseModel from '#models/base'

export default class ItemsController {
/**
  *  Get item by id
  *  @return Object - Item object
  */
  public async getOne({ auth, params, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const item = await Item.query()
        .apply((scopes) => {
          scopes.account(user),
          scopes.id(params.id),
          scopes.preload()
        })
        .firstOrFail()
      await BaseModel.loadCustomFields([item])
      return response.ok(item)
    } catch (error) {
      throw error
    }
  }

/**
  *  Get all items
  *  @return Array - Array of items
  */
  public async getAll({ auth, request, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const { page = 1, perPage = 10, ...filters } = request.qs()
      const customFieldsFromDb = await CustomField.query().select('id', 'label').where('account_id', user.accountId)
      const customFields = new Map(customFieldsFromDb.map(field => [field.label, field.id]))
      const items = await Item.query()
        .apply((scopes) => {
          scopes.account(user),
          scopes.filters(filters, customFields),
          scopes.preload()
        })
        .paginate(page, perPage)
      await BaseModel.loadCustomFields(items.all())
      return response.ok(items)
    } catch (error) {
      throw error
    }
  }

/**
  *  Create new item
  *  @return Object - Item object
  */
  public async create({ auth, request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(createItem)
      const user = auth.getUserOrFail()
      const item = await Item.create({ ...payload, accountId: user!.accountId})
      if (payload.tags) await item.related('tags').sync(payload.tags); await item.load('tags')
      const customFields = Object.entries(request.body()).filter(([key]) => !(key in payload))
      await item.mergeCustomField(customFields)
      await item.refresh()
      return response.ok(item)
    } catch (error) {
      throw error
    }
  }

/**
  *  Update item 
  *  @return Object - Updated item object
  */
  public async update({ auth, params, request, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const item = await Item.query()
        .apply((scopes) => {
          scopes.account(user),
          scopes.id(params.id),
          scopes.preload()
        })
        .firstOrFail()
      const payload = await request.validateUsing(updateItem)
      await item.merge(payload).save() 
      if (payload.tags) await item.related('tags').sync(payload.tags); await item.load('tags')
      const customFields = Object.entries(request.body()).filter(([key]) => !(key in payload))
      await item.mergeCustomField(customFields)
      return response.ok(item)
    } catch (error) {
      throw error
    }
  }

/**
  *  Delete item 
  *  @return Object - Success message
  */
  public async delete({ auth, params, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const item = await Item.query()
        .apply((scopes) => {
          scopes.account(user),
          scopes.id(params.id)
        })
        .firstOrFail()
      await item.delete()
      await item.deleteCustomFieldValues()
      return response.json({ message: 'item deleted successfully' })
    } catch (error) {
      throw error
    }
  }
}