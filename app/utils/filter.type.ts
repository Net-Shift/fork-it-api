export type ComparaisonOperator = '>' | '>=' | '<' | '<=' | '=' | '!=' | 'like' | 'not like'
export type InOperator = 'in' | 'not in'
export type BetweenOperator = 'between' | 'not between'
export type NullFilter = 'isNull' | 'isNotNull'

export interface BaseFilter {
  operator: ComparaisonOperator | InOperator | BetweenOperator
  value?: string | number
  values?: (string | number)[] | [number, number]
  custom?: boolean
  preload?: boolean
}

export type Filter = BaseFilter | NullFilter | any