import moment from 'moment'
import { Span, ValueSpan } from '../src'

export function span(start: string, end: string): Span

export function span<T>(start: string, end: string, value: T): ValueSpan<T>

export function span<T>(start: string, end: string, value?: T) {
  let s: Span = {
    start: time(start),
    end: time(end)
  }

  if (value) {
    return { ...s, value } as ValueSpan<T>
  } else {
    return s
  }
}

export function time(time: string) {
  return moment(moment.utc(`2000-01-01 ${time}:00`).valueOf())
}

export const normalizeMoment = (m: moment.Moment) => moment(m.valueOf())

export const normalizeSpans = (spans: Span[]) => {
  return spans.map(s => {
    return { ...s, start: normalizeMoment(s.start), end: normalizeMoment(s.end) }
  })
}

export const hours = 3600
