import flatMap from 'lodash/flatMap'
import { MapperFn } from '../mappers'
import { flatten } from '../operations/flatten'
import { Span } from '../span'

export const subtractor = function<T extends Span>(right: Span | Span[]): MapperFn<T, T> {
  let rights = Array.isArray(right) ? right : [right]

  // Make sure spans are non-overlapping
  rights = flatten(rights)

  return (left: T) => {
    let lefts = [left]

    for (const r of rights) {
      lefts = flatMap(lefts, l => Span.subtract(l, r))
    }

    return lefts
  }
}
