import pull from 'lodash/pull'
import { Moment } from 'moment'
import { AggregatorFn } from '../aggregators'
import { Events } from '../events'
import { Schedule, Span, ValueSpan } from '../span'

export function aggregate<T extends Span, V>(
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
