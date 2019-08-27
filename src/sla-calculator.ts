import { Moment, default as moment } from 'moment'

import pull from 'lodash/pull'
import flatMap from 'lodash/flatMap'
import compact from 'lodash/compact'

export interface Span {
  start: Moment
  end: Moment
}

export interface ValueSpan<T = any> extends Span {
  value: T
}

export type SpanList<T extends Span = Span> = Array<T>

/**
 * Blah blah
 */
export namespace Spans {
  /**
   *
   * @param spans
   * @param start
   * @param end
   */
  export function trim<T extends Span>(spans: T[], start: Moment, end: Moment): T[] {
    return map(spans, Mappers.trimmer<T>(start, end))
  }

  /**
   * Merges any overlapping or adjacent slots into one continuous slot.
   *
   * @param spans List of slots to flatten
   * @returns Track with no overlapping slots
   */
  export function flatten(spans: SpanList): SpanList {
    const events = Events.fromSpans(spans)
    const flattened: SpanList = []

    let active: SpanList = []
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

  /**
   * Maps each span using to zero, one or several spans
   * @param spans
   * @param mapper
   */
  export function map<T extends Span, V extends Span>(spans: T[], mapper: Mappers.MapperFn<T, V>) {
    return compact(spans.map(mapper))
  }

  export function aggregate<T extends Span, V>(
    spans: T[],
    agg: Aggregators.AggregatorFn<T, V>
  ): ValueSpan<V>[] {
    const events = Events.fromSpans(spans)
    const aggregated: ValueSpan<V>[] = []

    let active: T[] = []
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

  export namespace Mappers {
    export type MapperFn<T extends Span, V extends Span> = (span: T) => V | null

    export const duration: MapperFn<Span, ValueSpan<number>> = span => {
      return { ...span, value: (span.end.valueOf() - span.start.valueOf()) / 1000 }
    }

    export const trimmer = function<T extends Span>(start: Moment, end: Moment): MapperFn<T, T> {
      return (span: T) => {
        if (span.end.isSameOrBefore(start) || span.start.isSameOrAfter(end)) {
          return null // Skipped
        } else {
          const overlap: T = { ...span }

          if (overlap.start.isBefore(start)) {
            overlap.start = start
          }

          if (overlap.end.isAfter(end)) {
            overlap.end = end
          }

          return overlap
        }
      }
    }
  }

  export namespace Aggregators {
    export type AggregatorFn<T extends Span, V> = (spans: T[]) => V

    export const sum: AggregatorFn<ValueSpan<number>, number> = function(spans) {
      return spans.map(span => span.value).reduce((prev, value) => prev + value)
    }

    export const count: AggregatorFn<any, number> = function(slots) {
      return slots.length
    }

    export const identity: AggregatorFn<any, Span[]> = function(slots): Span[] {
      return [...slots]
    }

    export const ratio = function(total: number): AggregatorFn<any, number> {
      return slots => count(slots) / total
    }
  }
}

export interface Event<T extends Span> {
  type: Events.Type
  time: Moment
  span: T
}

export namespace Events {
  export enum Type {
    Started = 'started',
    Ended = 'ended'
  }

  export function chronological<T extends Span>(events: Array<Event<T>>) {
    return events.sort((a, b) => {
      let diff = a.time.valueOf() - b.time.valueOf()
      if (diff === 0) {
        if (a.type === Type.Started) {
          return 1
        } else {
          return -1
        }
      }
      return diff
    })
  }

  export function fromSpan<T extends Span>(span: T): Array<Event<T>> {
    return [
      { type: Type.Started, time: span.start, span: span },
      { type: Type.Ended, time: span.end, span: span }
    ]
  }

  export function fromSpans<T extends Span>(spans: SpanList<T>): Array<Event<T>> {
    return chronological(flatMap(spans, slot => fromSpan(slot)))
  }
}
