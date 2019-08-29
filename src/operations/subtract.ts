import { map } from './map'
import { Span, Schedule } from '../span'
import { subtractor } from '../mappers/subtractor'

export function subtract<T extends Span>(left: Schedule<T>, right: Span | Schedule): Schedule<T> {
  return map(left, subtractor(right))
}
