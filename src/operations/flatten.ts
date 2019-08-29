import { Schedule } from '../span'
import { Moment } from 'moment'
import { Events } from '../events'
import pull from 'lodash/pull'

/**
 *
 * @param schedule
 */
export function flatten(schedule: Schedule): Schedule {
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
