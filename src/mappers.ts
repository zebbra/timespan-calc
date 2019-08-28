import { Span, ValueSpan, Schedule } from '.'
import { Moment, default as moment } from 'moment'
import flatMap from 'lodash/flatMap'

export type MapperFn<T extends Span, V extends Span> = (span: T) => V[]

const duration: MapperFn<Span, ValueSpan<number>> = span => {
  return [{ ...span, value: (span.end.valueOf() - span.start.valueOf()) / 1000 }]
}

const trimmer = function<T extends Span>(start: Moment, end: Moment): MapperFn<T, T> {
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

const subtractor = function<T extends Span>(right: Span | Span[]): MapperFn<T, T> {
  if (!Array.isArray(right)) {
    right = [right]
  }
  const rranges = right.map(Span.toRange)

  return (left: T) => {
    let res = [Span.toRange(left)]

    for (const rrange of rranges) {
      res = flatMap(res, r => r.subtract(rrange))
    }

    return res.map(r => {
      return { ...left, start: moment(r.start.valueOf()), end: moment(r.end.valueOf()) }
    })
  }
}

export const Mappers = {
  trimmer,
  subtractor,
  duration
}
