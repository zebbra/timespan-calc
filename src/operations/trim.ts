import { Moment } from 'moment'
import { trimmer } from '../mappers/trimmer'
import { Schedule, Span } from '../span'
import { map } from './map'

/**
 *
 * @param schedule
 * @param start
 * @param end
 */
export function trim<T extends Span>(
  schedule: Schedule<T>,
  start: Moment,
  end: Moment
): Schedule<T> {
  return map(schedule, trimmer<T>(start, end))
}
