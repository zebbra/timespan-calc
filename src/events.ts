import { Span, Schedule } from '.'
import flatMap from 'lodash/flatMap'
import { Moment } from 'moment'

export interface Event<T extends Span> {
  type: Type
  time: Moment
  span: T
}

enum Type {
  Started = 'started',
  Ended = 'ended'
}

function chronological<T extends Span>(events: Array<Event<T>>) {
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

function fromSpan<T extends Span>(span: T): Array<Event<T>> {
  return [
    { type: Type.Started, time: span.start, span: span },
    { type: Type.Ended, time: span.end, span: span }
  ]
}

function fromSchedule<T extends Span>(schedule: Schedule<T>): Array<Event<T>> {
  return chronological(flatMap(schedule, slot => fromSpan(slot)))
}

export const Events = {
  Type,
  fromSpan,
  fromSchedule,
  chronological
}
