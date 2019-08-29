import { DateRange } from 'moment-range'
import { Moment } from 'moment'

export interface Span {
  start: Moment
  end: Moment
}

export interface ValueSpan<T = any> extends Span {
  value: T
}

export type Schedule<T extends Span = Span> = Array<T>

export namespace Span {
  /**
   * Converts a {@link Span} to a {@link moment-range#DateRange}
   * @param span - The {@link Span} to convert
   */
  export function toRange(span: Span): DateRange {
    return new DateRange(span.start, span.end)
  }

  export function fromRange(range: DateRange): Span {
    return { start: range.start, end: range.end }
  }

  export function applyRange<T extends Span>(span: T, range: DateRange): T {
    return { ...(span as object), ...fromRange(range) } as T
  }

  export function intersect<T extends Span>(left: T, right: Span): T | null {
    const intersection = toRange(left).intersect(toRange(right))
    if (intersection) {
      return applyRange(left, intersection)
    } else {
      return null
    }
  }

  /**
   * Subtracts one {@link Span} from another {@link Span}.
   *
   * @param left
   * @param right
   * @returns An array of 0 to 2 spans
   */
  export function subtract<T extends Span>(left: T, right: Span): T[] {
    return toRange(left)
      .subtract(toRange(right))
      .map(range => applyRange(left, range))
  }
}
