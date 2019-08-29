import compact from 'lodash/compact'
import flatMap from 'lodash/flatMap'
import { MapperFn } from '../mappers'
import { flatten } from '../operations/flatten'
import { Span } from '../span'

export const intersector = function<T extends Span>(right: Span | Span[]): MapperFn<T, T> {
  right = Array.isArray(right) ? right : [right]

  // Make sure spans are non-overlapping
  right = flatten(right)

  return (left: T) => {
    const intersections = flatMap(right, r => Span.intersect(left, r))
    return compact(intersections)
  }
}
