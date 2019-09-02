import { AggregatorFn, Aggregators } from '../aggregators'
import { duration } from '../mappers/duration'
import { flatten } from '../operations/flatten'
import { map } from '../operations/map'
import { trim } from '../operations/trim'
import { Span } from '../span'

export const coverage = function(spans: Span[], period: Span) {
  const durations = map(flatten(trim(spans, period.start, period.end)), duration)
  return Aggregators.sum(durations) / Span.duration(period)
}
