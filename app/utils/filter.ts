import { LucidModel, LucidRow, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

type ComparaisonOperator = '>' | '>=' | '<' | '<=' | '=' | '!=' | 'like' | 'not like'

interface ComparaisonFilter {
  operator: ComparaisonOperator
  value: string
}

interface InFilter {
  operator: 'in' | 'not in'
  values: (string | number)[]
}

interface BetweenFilter {
  operator: 'between' | 'not between'
  values: [number, number]
}

type NullFilter = 'isNull' | 'isNotNull'

type Filter = 
    | ComparaisonFilter
    | InFilter
    | BetweenFilter
    | NullFilter
    | any

export function queryFilters(
  query: ModelQueryBuilderContract<LucidModel, LucidRow>,
  filters: { [field: string]: Filter },
  customFields: Map<string, number> = new Map()
): ModelQueryBuilderContract<LucidModel, LucidRow> {
  const target = query.model.table
  filters = cleanFiltersRequest(query.model, filters, customFields)

  const customFieldFilters: { [field: string]: Filter } = {}
  for (const [field, filter] of Object.entries(filters)) {
    if (isCustomFieldFilter(filter)) {
      customFieldFilters[field] = filter?.value
      delete filters[field]
      continue
    }
  }
  if (Object.keys(customFieldFilters).length > 0) {
    query = applyCustomFieldFilters(query, customFieldFilters)
  }

  const preloadRelations = new Set<string>()
  for (const [field, filter] of Object.entries(filters)) {
    if (!filter) continue

    if (isRelationFilter(field)) {
      const [relation, relatedField] = field.split('.')
      preloadRelations.add(relation)
      query = query.whereHas(relation as any, (relatedQuery) =>
        queryFilters(relatedQuery, { [relatedField]: filter })
      )
      continue
    }
    const camelToSnake = (str: string) => str.replace(/[A-Z]/g, (c: string) => `_${c.toLowerCase()}`)
    const qualifiedField = field.includes('.') ? camelToSnake(field) : `${target}.${camelToSnake(field)}`
    if (isComparaisonFilter(filter)) {
      const { operator, value, values } = filter as any
      switch (operator) {
        case 'in':
          query = query.whereIn(qualifiedField, values)
          break
        case 'not in':
          query = query.whereNotIn(qualifiedField, values)
          break
        case 'between':
          query = query.whereBetween(qualifiedField, values)
          break
        case 'not between':
          query = query.whereNotBetween(qualifiedField, values)
          break
        case 'like':
          query.whereILike(qualifiedField, `%${value}%`)
          break
        case 'not like':
          query = query.where(qualifiedField, operator, `%${value}%`)
          break
        case 'isNull':
          query = query.whereNull(qualifiedField)
          break
        case 'isNotNull':
          query = query.whereNotNull(qualifiedField)
          break
        default:
          if (['>', '>=', '<', '<=', '=', '!='].includes(operator)) {
            query = query.where(qualifiedField, operator, value)
          }
          break
      }
      continue
    }

    if (isPreloadFilter(filter)) {
      query.preload(field as any)
      continue
    }

    query = filter === 'isNull' 
      ? query.whereNull(qualifiedField)
      : filter === 'isNotNull' 
      ? query.whereNotNull(qualifiedField)
      : query.where(qualifiedField, filter)
  }
  
  return query.select(`${target}.*`)
}

function isCustomFieldFilter(filter: any): boolean {
  return (typeof filter === 'object' && 'custom' in filter)
}

function isRelationFilter(field: string): boolean {
  return field.includes('.')
}

function isComparaisonFilter(filter: any): boolean {
  return (typeof filter === 'object' && 'operator' in filter)
}

function isPreloadFilter(filter: any): boolean {
  return (typeof filter === 'object' && 'preload' in filter)
}

function applyCustomFieldFilters(
  query: ModelQueryBuilderContract<LucidModel, LucidRow>,
  customFieldFilters: { [field: string]: Filter }
): ModelQueryBuilderContract<LucidModel, LucidRow> {
  let index = 0
  const target = query.model.table
  for (const [field, filter] of Object.entries(customFieldFilters)) {
    const aliasCfv = `cfv_${index}`
    const aliasCf = `cf_${index}`
    
    query = query
      .innerJoin(`custom_field_values as ${aliasCfv}`, `${target}.id`, `${aliasCfv}.target_id`)
      .innerJoin(`custom_fields as ${aliasCf}`, `${aliasCfv}.custom_field_id`, `${aliasCf}.id`)
      .where(`${aliasCf}.label`, field)

    if (typeof filter === 'object' && 'operator' in filter) {
      const { operator, value, values } = filter as any
      switch (operator) {
        case 'in':
          query = query.whereIn(`${aliasCfv}.value`, values)
          break
        case 'not in':
          query = query.whereNotIn(`${aliasCfv}.value`, values)
          break
        case 'like':
          query = query.where(`${aliasCfv}.value`, 'LIKE', `%${value}%`)
          break
        case 'not like':
          query = query.where(`${aliasCfv}.value`, 'NOT LIKE', `%${value}%`)
          break
        case 'between':
          query = query.whereBetween(`${aliasCfv}.value`, values)
          break
        case 'not between':
          query = query.whereNotBetween(`${aliasCfv}.value`, values)
          break
        case 'isNull':
          query = query.whereNull(`${aliasCfv}.value`)
          break
        case 'isNotNull':
          query = query.whereNotNull(`${aliasCfv}.value`)
          break
        default:
          if (['>', '>=', '<', '<=', '=', '!='].includes(operator)) {
            query = query.where(`${aliasCfv}.value`, operator, value)
          }
          break
      }
    } else {
      query = query.where(`${aliasCfv}.value`, filter.toString())
    }
    
    index += 1
  }

  return query.select(`${target}.*`).distinctOn(`${target}.id`)
}

function cleanFiltersRequest(
  model: LucidModel,
  filters: { [field: string]: Filter },
  customFields: Map<string, number>
): { [field: string]: Filter } {
  const relations = [...(model.$relationsDefinitions?.keys() ?? [])]
  const columns = [...(model.$columnsDefinitions?.keys() ?? [])]
  const customFieldsNames = customFields ? [...(customFields.keys() ?? [])] : []

  const updatedFilters: Record<string, any> = {}
  for (const [key, value] of Object.entries(filters)) {
    const [relation] = key.split('.')
    console.log('key', key)
    const isValidFilter =
      key === 'preload' ||
      columns.includes(key) ||
      relations.includes(key) ||
      relations.includes(relation) ||
      customFieldsNames.includes(key)

    console.log('isValidFilter', isValidFilter)
    if (isValidFilter) {
      if (customFieldsNames.includes(key)) {
        updatedFilters[key] = { value, custom: true }
      } else {
        updatedFilters[key] = value
      }
    }
  }
  return updatedFilters
}

export function queryPreload(
  query: ModelQueryBuilderContract<LucidModel, LucidRow>
): ModelQueryBuilderContract<LucidModel, LucidRow> {
  const model = query.model
  if (!model.$relationsDefinitions) return query
  
  const relations = Array.from(model.$relationsDefinitions.keys())
  relations.forEach(relation => {
    query.preload(relation as any)
  })
  return query
}