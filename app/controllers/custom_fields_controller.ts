import type { HttpContext } from '@adonisjs/core/http'
import CustomField from '#models/custom_field'
import CustomFieldValue from '#models/custom_field_value'
import { createCustomField, updateCustomField } from '#validators/custom_field'
import db from '@adonisjs/lucid/services/db'

export default class CustomFieldController {
/**
  *  Get customField by id
  *  @return Object - customField object
  */
  public async getOne({ auth, params, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const customField = await CustomField.query()
        .apply((scopes) => {
          scopes.account(user),
          scopes.id(params.id)
          scopes.preload()
        })
        .firstOrFail()
      return response.ok(customField)
    } catch (error) {
      throw error
    }
  }

/**
  *  Get all customField
  *  @return Object - array of customField and pagination data
  */
  public async getAll({ auth, request, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const { page = 1, perPage = 10, ...filters } = request.qs()
      const customField = await CustomField.query()
        .apply((scopes) => {
          scopes.account(user),
          scopes.filters(filters)
          scopes.preload()
        })
        .paginate(page, perPage)
      return response.ok(customField)
    } catch (error) {
      throw error
    }
  }

/**
  *  Create customField 
  *  @return Object - Success message
  */
  public async create({ auth, request, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const payload = await request.validateUsing(createCustomField)
      const { options, ...customFieldData } = payload
  
      const customField = await CustomField.create({ 
        ...customFieldData, 
        accountId: user.accountId 
      })
  
      if ((customField.fieldType === 'select' || customField.fieldType === 'multiselect') && options?.length) {
        await customField.related('options').createMany(options)
      }
  
      const records = await db.from(payload.targetModel)
        .where('account_id', user.accountId)
        .select('id')
  
      if (records.length) {
        const defaultValues = records.map(record => ({
          targetId: record.id,
          customFieldId: customField.id,
          value: payload.defaultValue || null
        }))
        await CustomFieldValue.createMany(defaultValues)
      }
  
      await customField.load('options')
      return response.ok(customField)
    } catch (error) {
      throw error
    }
  }

/**
  *  Update customField 
  *  @return Object - Success message
  */
  public async update({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(updateCustomField)
    const { options, ...customFieldData } = payload
    const customField = await CustomField.query()
      .apply((scopes) => {
        scopes.account(user)
        scopes.id(params.id)
      })
      .preload('options')
      .firstOrFail()
    const oldCustomField = JSON.parse(JSON.stringify(customField))
    await customField.merge(customFieldData).save()

    const records = await db.from(customField.targetModel)
      .where('account_id', user.accountId)
      .select('id')

    if ((customField.fieldType === 'select' || customField.fieldType === 'multiselect') && options?.length) {
      const validOptions = await this.updateFieldOptions(customField, options)
      await this.updateFieldValues(customField, records, validOptions)
    }

    if (customFieldData.defaultValue !== undefined && customFieldData.defaultValue !== oldCustomField.defaultValue && records.length) {
      await this.updateDefaultValues(customField, records, customFieldData.defaultValue)
    }

    await customField.load('options')
    return response.ok(customField)
  }

  private async updateFieldOptions(customField: CustomField, newOptions: any[]) {
    const existingOptions = new Map(customField.options.map(opt => [opt.value, opt]))
    const validOptions = new Set(newOptions.map(opt => opt.value))

    for (const option of newOptions) {
      const existingOption = existingOptions.get(option.value)
      if (!existingOption) {
        await customField.related('options').create(option)
      } else if (existingOption.label !== option.label) {
        await customField.related('options')
          .query()
          .where('value', option.value)
          .update({ label: option.label })
      }
      existingOptions.delete(option.value)
    }

    const valuesToDelete: string[] = Array.from(existingOptions.keys()).filter((key): key is string => key !== null);
    if (valuesToDelete.length) {
      await customField.related('options')
        .query()
        .whereIn('value', valuesToDelete)
        .delete()
    }

    return validOptions
  }

  private async updateFieldValues(customField: CustomField, records: any[], validOptions: Set<string>) {
    if (!records.length) return

    const existingValues = await CustomFieldValue.query()
      .where('customFieldId', customField.id)
      .whereIn('targetId', records.map(r => r.id))

    const valuesToUpdate = []

    for (const value of existingValues) {
      if (customField.fieldType === 'multiselect') {
        const values = JSON.parse(value.value || '[]')
        const validValues = values.filter((val: string) => validOptions.has(val))
        
        if (validValues.length !== values.length) {
          valuesToUpdate.push({
            targetId: value.targetId,
            customFieldId: customField.id,
            value: validValues.length ? JSON.stringify(validValues) : null
          })
        }
      } else if (value.value !== null && !validOptions.has(value.value)) {
        valuesToUpdate.push({
          targetId: value.targetId,
          customFieldId: customField.id,
          value: null
        })
      }
    }

    if (valuesToUpdate.length) {
      await CustomFieldValue.updateOrCreateMany(
        ['targetId', 'customFieldId'],
        valuesToUpdate
      )
    }
  }

  private async updateDefaultValues(customField: CustomField, records: any[], defaultValue: any) {
    const existingValues = await CustomFieldValue.query()
      .where('customFieldId', customField.id)
      .whereIn('targetId', records.map(r => r.id))
      .whereNotNull('value')

    const valuesToUpdate = records
      .filter(record => !existingValues.some(v => v.targetId === record.id && v.value !== null))
      .map(record => ({
        targetId: record.id,
        customFieldId: customField.id,
        value: customField.fieldType === 'multiselect' 
          ? JSON.stringify([defaultValue])
          : defaultValue
      }))

    if (valuesToUpdate.length) {
      await CustomFieldValue.updateOrCreateMany(
        ['targetId', 'customFieldId'],
        valuesToUpdate
      )
    }
  }


/**
  *  Delete customField 
  *  @return Object - Success message
  */
  public async delete({ auth, params, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const list = await CustomField.query()
        .apply((scopes) => {
          scopes.account(user),
          scopes.id(params.id)
        })
        .firstOrFail()
      await list.delete()
      return response.json({ message: 'customField deleted successfully' })
    } catch (error) {
      throw error
    }
  }
}