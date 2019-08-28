import flatMap from 'lodash/flatMap'
import pull from 'lodash/pull'
import { Moment } from 'moment'

import { Schedule, Span, ValueSpan } from '.'
import { Events } from './events'
import { MapperFn, Mappers } from './mappers'
import { AggregatorFn } from './aggregators'

/**
 *
 * @param schedule
 * @param start
 * @param end
 */
function trim<T extends Span>(schedule: Schedule<T>, start: Moment, end: Moment): Schedule<T> {
  return map(schedule, Mappers.trimmer<T>(start, end))
}

/**
 * Maps each span using to zero, one or several schedule
 * @param schedule
 * @param mapper
 */
function map<T extends Span, V extends Span>(
  schedule: Schedule<T>,
  mapper: MapperFn<T, V>
): Schedule<V> {
  return flatMap(schedule, mapper)
}

/**
 *
 * @param schedule
 */
function flatten(schedule: Schedule): Schedule {
  const events = Events.fromSchedule(schedule)
  const flattened: Schedule = []

  let active: Schedule = []
  let start: Moment | null = null
  for (const event of events) {
    if (event.type === Events.Type.Started) {
      if (start === null) {
        const last = flattened.pop()

        if (last) {
          if (last.end.isSame(event.time)) {
            start = last.start
          } else {
            flattened.push(last)
            start = event.time
          }
        } else {
          start = event.time
        }
      }

      active.push(event.span)
    } else {
      pull(active, event.span)

      if (start && active.length === 0) {
        flattened.push({ start, end: event.time })
        start = null
      }
    }
  }

  return flattened
}

function aggregate<T extends Span, V>(
  schedule: Schedule<T>,
  agg: AggregatorFn<T, V>
): ValueSpan<V>[] {
  const events = Events.fromSchedule(schedule)
  const aggregated: ValueSpan<V>[] = []

  let active: Schedule<T> = []
  let start: Moment | null = null

  for (const event of events) {
    if (start !== null && !start.isSame(event.time)) {
      aggregated.push({ start, end: event.time, value: agg(active) })
      start = event.time
    }

    if (event.type === Events.Type.Started) {
      if (active.length === 0) {
        start = event.time
      }

      active.push(event.span)
    } else {
      pull(active, event.span)

      if (active.length === 0) {
        start = null
      }
    }
  }

  return aggregated
}

function subtract<T extends Span>(left: Schedule<T>, right: Span[]): Schedule<T> {
  return map(left, Mappers.subtractor(right))
}

export const Operations = {
  trim,
  map,
  flatten,
  aggregate,
  subtract
}
