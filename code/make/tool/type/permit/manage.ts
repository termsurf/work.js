import { toPascalCase } from '~/code/tool/helper'
import { BaseType } from '~/code/type/base'
import { MutatePermitType } from '~/code/type/permit/mutate'
import {
  SchemaFilterPossibleType,
  SchemaPropertyContainerType,
  SchemaPropertyType,
} from '~/code/type/schema'

export function handleFilter({
  base,
  filter,
  optional,
}: {
  base: BaseType
  filter: SchemaFilterPossibleType
  optional?: boolean
}) {
  const list: Array<string> = []

  if (Array.isArray(filter)) {
    list.push(`filter${optional ? '?' : ''}:`)
    filter.forEach(filter => {
      list.push(`  | {`)
      handleEachProperty({
        base,
        schema: { type: 'object', property: filter },
      }).forEach(line => {
        list.push(`    ${line}`)
      })
      list.push(`  }`)
    })
  } else {
    list.push(`filter${optional ? '?' : ''}: {`)
    handleEachProperty({
      base,
      schema: { type: 'object', property: filter },
    }).forEach(line => {
      list.push(`  ${line}`)
    })
    list.push(`}`)
  }

  return list
}

export function handleSchema({
  base,
  mutate,
}: {
  base: BaseType
  mutate: MutatePermitType
}) {
  const list: Array<string> = []

  if ('filter' in mutate && mutate.filter) {
    handleFilter({ base, filter: mutate.filter }).forEach(line => {
      list.push(line)
    })
  }

  if ('effect' in mutate && mutate.effect) {
    list.push(`effect: {`)
    handleEachProperty({
      base,
      schema: { type: 'object', property: mutate.effect },
    }).forEach(line => {
      list.push(`  ${line}`)
    })
    list.push(`}`)
  }

  if ('extend' in mutate && mutate.extend) {
    list.push(`extend: ${toPascalCase(mutate.extend)}ExtendType`)
  }

  return list
}

export function handleEachProperty({
  base,
  schema,
}: {
  base: BaseType
  schema: SchemaPropertyContainerType
}) {
  const list: Array<string> = []
  for (const name in schema.property) {
    const property = schema.property[name]

    handleProperty({ base, name, property }).forEach(line => {
      list.push(`${line}`)
    })
  }
  return list
}

export function handleProperty({
  name,
  base,
  property,
}: {
  base: BaseType
  name: string
  property: SchemaPropertyType
}) {
  const list: Array<string> = []
  const optional = property.optional ? '?' : ''
  const listPrefix = property.list ? `Array<` : ''
  const listSuffix = property.list ? `>` : ''

  function push(expression: string) {
    list.push(
      `${name}${optional}: ${listPrefix}${expression}${listSuffix}`,
    )
  }

  switch (property.type) {
    case 'timestamp':
      push(`Date`)
      break
    case 'text':
    case 'uuid':
      push(`string`)
      break
    case 'integer':
    case 'decimal':
      push(`number`)
      break
    case 'boolean':
      push(`boolean`)
      break
    case 'json':
      push(`object`)
      break
    case 'object':
      list.push(`${name}${optional}: ${listPrefix}{`)
      handleEachProperty({ base, schema: property }).forEach(line => {
        list.push(`  ${line}`)
      })
      list.push(`}${listSuffix}`)
      break
    default:
      throw new Error(`Invalid permit type property '${property.type}'`)
  }

  return list
}
