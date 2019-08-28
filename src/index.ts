import { Moment } from 'moment'
import { DateRange } from 'moment-range'

export interface Span {
  start: Moment
  end: Moment
}

export interface ValueSpan<T = any> extends Span {
  value: T
}

export namespace Span {
  export function toRange(span: Span): DateRange {
    return new DateRange(span.start, span.end)
  }
}

export type Schedule<T extends Span = Span> = Array<T>

export * from './mappers'
export * from './events'
export * from './aggregators'
export * from './operations'
