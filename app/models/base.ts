import { BaseModel as AdonisBaseModel, scope } from '@adonisjs/lucid/orm'
import { queryFilters } from '#utils/filter'
import { DateTime } from 'luxon'

export default class BaseModel extends AdonisBaseModel {

  public static id = scope((query, id) => {
    query.where('id', id)
  })

  public static account = scope((query, user) => {
    if (user && user.profil !== 'superadmin') {
      query.where('accountId', user.accountId)
    }
  })

  public static preload = scope((query, dataToPreload?: string[]) => {
    // if (!query.model.$relationsDefinitions) return
    const relations = [...query.model.$relationsDefinitions.keys()]
    // const relationsToPreload = dataToPreload?.filter(r => relations.includes(r)) ?? relations
    const relationsToPreload = dataToPreload ?? relations
    relationsToPreload.forEach(r => {
      const [relation, nested] = r.split('.')
      if (nested) query.preload(relation as any, (q: any) => { q.preload(nested) })
      else query.preload(relation as any)
    })
  })

  public static filters = scope((query, filters, customFields = null) => {
    query = queryFilters(query, filters, customFields)
  })

  // @afterPaginate()
  public static async loadCustomFields(models: BaseModel[]) {
    if (!models.length) return
    const modelList = Array.isArray(models) ? models : [models]
    await Promise.all(modelList.map(async (model) => 
      await model.load('customFieldValues' as any, (query: any) => {
        query.select('id', 'value', 'customFieldId', 'targetId')
          .preload('customField', (customFieldQuery: any) => {
            customFieldQuery.select('id', 'name', 'label')
          })
      })
    ))
    modelList.forEach(model => model.serializeCustomFieldsData())
  }

  public serializeCustomFieldsData() {
    const customFieldValues = (this as any).customFieldValues
    if (!customFieldValues?.length) return
    this.$extras = {
      ...this.$extras,
      ...customFieldValues.reduce((acc: Record<string, any>, fieldValue: any) => {
        const fieldName = fieldValue.customField?.label
        if (fieldName) {
          acc[fieldName] = fieldValue.value
        }
        return acc
      }, {})
    }
  }

  public serialize() {
    const { customFieldValues, ...data } = super.serialize() // customFieldValues,
    return { ...data, ...this.$extras }
  }

  public async mergeCustomField(customFieldEntries: [string, any][] = []): Promise<this> {
    const { default: CustomField } = await import('#models/custom_field')
    const { default: CustomFieldValue } = await import('#models/custom_field_value')
  
    const targetModel = `${this.constructor.name.toLowerCase()}s`
    
    const customFields = await CustomField.query()
      .where('account_id', (this as any).accountId)
      .where('targetModel', targetModel)
      .preload('options')
  
    const values = []
    
    for (const [name, value] of customFieldEntries) {
      const field = customFields.find(f => f.label === name)
      if (!field) continue
  
      if (['select', 'multiselect'].includes(field.fieldType)) {
        const availableOptions = field.options.map(option => option.value)
        if (field.fieldType === 'multiselect') {
          const valueArray = Array.isArray(value) ? value : [value]
          const areValuesValid = valueArray.every(v => availableOptions.includes(v))
          if (!areValuesValid) {
            throw new Error(`Invalid values for multiselect field "${name}". Allowed values: ${availableOptions.join(', ')}`)
          }
        } else {
          if (!availableOptions.includes(value)) {
            throw new Error(`Invalid value for select field "${name}". Allowed values: ${availableOptions.join(', ')}`)
          }
        }
      }
  
      const processedValue = field.fieldType === 'multiselect'
        ? JSON.stringify(Array.isArray(value) ? value : [value])
        : value
  
      values.push({
        targetId: (this as any).id,
        customFieldId: field.id,
        value: processedValue
      })
  
      this.$extras[name] = field.fieldType === 'multiselect'
        ? JSON.parse(processedValue)
        : processedValue
    }
  
    for (const field of customFields) {
      const isFieldProvided = customFieldEntries.some(([name]) => name === field.label)
      if (!isFieldProvided && field.defaultValue !== null && field.defaultValue !== undefined) {
        const processedValue = field.fieldType === 'multiselect'
          ? JSON.stringify(Array.isArray(field.defaultValue) ? field.defaultValue : [field.defaultValue])
          : field.defaultValue
  
        values.push({
          targetId: (this as any).id,
          customFieldId: field.id,
          value: processedValue
        })
  
        if (field.label) {
          this.$extras[field.label] = field.fieldType === 'multiselect'
            ? JSON.parse(processedValue)
            : processedValue
        }
      }
    }
  
    if (values.length) {
      await CustomFieldValue.updateOrCreateMany(
        ['targetId', 'customFieldId'],
        values
      )
    }
  
    (this as any).updatedAt = DateTime.now()
    return await this.save()
  }

  public async deleteCustomFieldValues(): Promise<void> {
    const { default: CustomFieldValue } = await import('#models/custom_field_value')
    
    await CustomFieldValue.query()
      .where('targetId', (this as any).id)
      .delete()
  }
}