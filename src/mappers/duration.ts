import { MapperFn } from '../mappers'
import { Span, ValueSpan } from '../span'

export const duration: MapperFn<Span, ValueSpan<number>> = span => {
  return [{ ...span, value: (span.end.valueOf() - span.start.valueOf()) / 1000 }]
}
