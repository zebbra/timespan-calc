import { Schedule, Span, ValueSpan } from './span'

export type AggregatorFn<T extends Span, V> = (schedule: Schedule<T>) => V

const sum: AggregatorFn<ValueSpan<number>, number> = function(schedule) {
  return schedule.map(span => span.value).reduce((prev, value) => prev + value)
}

const count: AggregatorFn<any, number> = function(schedule) {
  return schedule.length
}

const identity: AggregatorFn<any, Span[]> = function(schedule) {
  return [...schedule]
}

const ratio = function(total: number): AggregatorFn<any, number> {
  return slots => count(slots) / total
}

export const Aggregators = {
  sum,
  count,
  identity,
  ratio
}
