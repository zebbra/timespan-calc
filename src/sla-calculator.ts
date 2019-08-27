import { Moment } from 'moment'

import pull from 'lodash/pull'
import flatMap from 'lodash/flatMap'

export interface Slot<T = any> {
  start: Moment
  end: Moment
  value?: T
}

export type SlotList<T = any> = Array<Slot<T>>
export type Track<T = any> = SlotList<T>
export type TrackList<T = any> = Array<SlotList<T>>

/**
 * Blah blah
 */
export namespace Slots {
  /**
   *
   * @param track
   * @param start
   * @param end
   */
  export function trim<V = any>(track: Track<V>, start: Moment, end: Moment): Track<V> {
    return map(track, slot => {
      if (slot.end.isSameOrBefore(start) || slot.start.isSameOrAfter(end)) {
        return null // Skipped
      } else {
        const overlap = { ...slot }

        if (overlap.start.isBefore(start)) {
          overlap.start = start
        }

        if (overlap.end.isAfter(end)) {
          overlap.end = end
        }

        return overlap
      }
    })
  }

  /**
   * Merges any overlapping or adjacent slots into one continuous slot.
   *
   * @param track List of slots to flatten
   * @returns Track with no overlapping slots
   */
  export function flatten(track: Track): Track<undefined> {
    const events = Events.fromTrack(track)
    const flattened: Track = []

    let active: SlotList = []
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

        active.push(event.slot)
      } else {
        pull(active, event.slot)

        if (start && active.length === 0) {
          flattened.push({ start, end: event.time })
          start = null
        }
      }
    }

    return flattened
  }

  /**
   * Maps each slot of track using @function MapperFn
   * @param track
   * @param mapper
   */
  export function map<T, V>(track: Track<T>, mapper: Mappers.MapperFn<T, V>): Track<V> {
    return track.map(mapper).filter(slot => slot !== null) as Track<V>
  }

  export function aggregate<T, V>(
    track: Track<T>,
    agg: Aggregators.AggregatorFn<T, V>
  ): Required<Track<V>> {
    const events = Events.fromTrack(track)
    const aggregated: Track<V> = []

    let active: SlotList<T> = []
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

        active.push(event.slot)
      } else {
        pull(active, event.slot)

        if (active.length === 0) {
          start = null
        }
      }
    }

    return aggregated
  }

  export namespace Mappers {
    export type MapperFn<T, V> = (slot: Slot<T>) => Slot<V> | null

    export const duration: MapperFn<any, number> = (slot: Slot) => {
      return { ...slot, value: (slot.end.valueOf() - slot.start.valueOf()) / 1000 }
    }
  }

  export namespace Aggregators {
    export type AggregatorFn<T, V> = (slots: SlotList<T>) => V

    export const sum: AggregatorFn<number, number> = function(slots: Required<SlotList>): number {
      return slots.map(slot => slot.value).reduce((prev, value) => prev + value)
    }

    export const count: AggregatorFn<any, number> = function(slots): number {
      return slots.length
    }

    export const group: AggregatorFn<any, SlotList> = function(slots): SlotList {
      return [...slots]
    }

    export const ratio = function(total: number): AggregatorFn<any, number> {
      return slots => count(slots) / total
    }
  }
}

export interface Event {
  type: Events.Type
  time: Moment
  slot: Slot
}

export namespace Events {
  export enum Type {
    Started = 'started',
    Ended = 'ended'
  }

  export function chronological(events: Array<Event>) {
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

  export function fromSlot(slot: Slot): Array<Event> {
    return [
      { type: Type.Started, time: slot.start, slot: slot },
      { type: Type.Ended, time: slot.end, slot: slot }
    ]
  }

  export function fromTrack(track: Track): Array<Event> {
    return chronological(flatMap(track, slot => fromSlot(slot)))
  }
}
