import { intersector } from '../mappers/intersector'
import { Schedule, Span } from '../span'
import { map } from './map'

export function intersect<T extends Span>(left: Schedule<T>, right: Span | Schedule): Schedule<T> {
  return map(left, intersector(right))
}
