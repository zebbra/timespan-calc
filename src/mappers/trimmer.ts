import { Span } from '../span'
import { Moment } from 'moment'
import { MapperFn } from '../mappers'

export const trimmer = function<T extends Span>(start: Moment, end: Moment): MapperFn<T, T> {
  return (span: T) => {
    if (span.end.isSameOrBefore(start) || span.start.isSameOrAfter(end)) {
      return []
    } else {
      const overlap: T = { ...(span as Span) } as T

      if (overlap.start.isBefore(start)) {
        overlap.start = start
      }

      if (overlap.end.isAfter(end)) {
        overlap.end = end
      }

      return [overlap]
    }
  }
}
