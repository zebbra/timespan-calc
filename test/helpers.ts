import moment from 'moment'
import { Span, ValueSpan } from '../src/sla-calculator'

export function span<T>(start: string, end: string, value?: T) {
  if (value) {
    return {
      start: time(start),
      end: time(end),
      value
    } as ValueSpan<T>
  } else {
    return {
      start: time(start),
      end: time(end),
      value
    } as Span
  }
}

export function time(time: string) {
  return moment.utc(`2000-01-01 ${time}:00`)
}

export const hours = 3600
