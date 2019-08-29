import flatMap from 'lodash/flatMap'
import { MapperFn } from '../mappers'
import { Schedule, Span } from '../span'

/**
 * Maps each span using to zero, one or several schedule
 * @param schedule
 * @param mapper
 */
export function map<T extends Span, V extends Span>(
  schedule: Schedule<T>,
  mapper: MapperFn<T, V>
): Schedule<V> {
  return flatMap(schedule, mapper)
}
