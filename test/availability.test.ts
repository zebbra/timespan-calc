import flatten from 'lodash/flatten'

import { Spans, SpanList, Span, ValueSpan } from '../src/sla-calculator'
import { span, hours } from './helpers'

describe('Availability Models', () => {
  type CI = SpanList
  type SOF = Array<CI>

  const ci1 = [span('00:00', '06:00'), span('11:00', '18:00')]
  const ci2 = [span('01:00', '07:00'), span('12:00', '19:00')]
  const ci3 = [span('02:00', '08:00'), span('13:00', '20:00')]
  const ci4 = [span('03:00', '09:00'), span('14:00', '21:00')]
  const ci5 = [span('04:00', '10:00'), span('15:00', '22:00')]

  const sof: SOF = [ci1, ci2, ci3, ci4, ci5]

  // Merge overlapping spans per CI then merge spans from all CIs
  // after which: number of overlapping spans => number of CIs down
  const spans = flatten(sof.map(ci => Spans.flatten(ci)))

  describe('All Model', () => {
    it('counts as down if all CIs are down', () => {
      // Calculate percentage of affected CIs
      const ratios = Spans.aggregate(spans, Spans.Aggregators.ratio(sof.length))

      // Get all spans where outage is 100%
      const downs = ratios.filter(span => span.value === 1)
      expect(downs).toEqual([
        span('04:00', '06:00', 1.0), // 100% down
        span('15:00', '18:00', 1.0) //  100% down
      ])

      // Use duration of span as span value (in seconds)
      const durations = Spans.map(downs, Spans.Mappers.duration)
      expect(durations).toEqual([
        span('04:00', '06:00', 2 * hours), // 2h
        span('15:00', '18:00', 3 * hours) //  3h
      ])

      // Get total of downtime in seconds
      const downtime = Spans.Aggregators.sum(durations)
      expect(downtime).toEqual(5 * hours) // 5h

      // Calculate availability
      const avail = 100 - (downtime / (24 * hours)) * 100
      expect(avail).toBeCloseTo(79.166)
    })
  })

  describe('More-than-one Model', () => {
    it('counts as down if more than one CIs is down', () => {
      // Count overlapping spans => number of CIs down
      const counts = Spans.aggregate(spans, Spans.Aggregators.count)

      // Get all spans where count > 1
      const downs = Spans.flatten(counts.filter(span => span.value! > 1))
      expect(downs).toEqual([
        span('01:00', '09:00'), //
        span('12:00', '21:00') //
      ])

      // Use duration of span as span value (in seconds)
      const durations = Spans.map(downs, Spans.Mappers.duration)
      expect(durations).toEqual([
        span('01:00', '09:00', 8 * 3600), // 8h
        span('12:00', '21:00', 9 * 3600) // 9h
      ])

      // Get total of downtime in seconds
      const downtime = Spans.Aggregators.sum(durations)
      expect(downtime).toEqual(17 * 3600) // 17h

      // Calculate availability
      const avail = 100 - (downtime / (24 * 3600)) * 100
      expect(avail).toBeCloseTo(29.166)
    })
  })

  describe('Downtime-ratio Model', () => {
    it('calculates availabilty based on duration and ratio of down CIs', () => {
      // Calculate percentage of affected CIs
      const ratios = Spans.aggregate(spans, Spans.Aggregators.ratio(sof.length))

      // Create mapper which multiplies duration based on ratio of down CIs
      const mapper: Spans.Mappers.MapperFn<ValueSpan<number>, ValueSpan<number>> = span => {
        const duration = (span.end.valueOf() - span.start.valueOf()) / 1000
        return { ...span, value: span.value * duration }
      }

      // Use partial duration of span as span value (in seconds)
      const durations = Spans.map(ratios, mapper)
      expect(durations).toEqual([
        span('00:00', '01:00', 3600 * 0.2),
        span('01:00', '02:00', 3600 * 0.4),
        span('02:00', '03:00', 3600 * 0.6),
        span('03:00', '04:00', 3600 * 0.8),
        span('04:00', '06:00', 3600 * 1.0 * 2), // 2h
        span('06:00', '07:00', 3600 * 0.8),
        span('07:00', '08:00', 3600 * 0.6),
        span('08:00', '09:00', 3600 * 0.4),
        span('09:00', '10:00', 3600 * 0.2),
        span('11:00', '12:00', 3600 * 0.2),
        span('12:00', '13:00', 3600 * 0.4),
        span('13:00', '14:00', 3600 * 0.6),
        span('14:00', '15:00', 3600 * 0.8),
        span('15:00', '18:00', 3600 * 1.0 * 3), // 3h
        span('18:00', '19:00', 3600 * 0.8),
        span('19:00', '20:00', 3600 * 0.6),
        span('20:00', '21:00', 3600 * 0.4),
        span('21:00', '22:00', 3600 * 0.2)
      ])

      // Get total of downtime in seconds
      const downtime = Spans.Aggregators.sum(durations)
      expect(downtime).toEqual(13 * 3600) // 13h

      // Calculate availability
      const avail = 100 - (downtime / (24 * 3600)) * 100
      expect(avail).toBeCloseTo(45.83)
    })
  })

  describe('Percentage Model (> 50%)', () => {
    it('counts as down if more than 50% CIs are down', () => {
      // Calculate percentage of affected CIs
      const ratios = Spans.aggregate(spans, Spans.Aggregators.ratio(sof.length))

      // Get all spans where outage is 100%
      const downs = ratios.filter(span => (span.value || 0) > 0.5)
      expect(downs).toEqual([
        span('02:00', '03:00', 0.6), // 60% down
        span('03:00', '04:00', 0.8), // 80% down
        span('04:00', '06:00', 1.0), // 100% down for 2h
        span('06:00', '07:00', 0.8), // 80% down
        span('07:00', '08:00', 0.6), //  60% down

        span('13:00', '14:00', 0.6), // 60% down
        span('14:00', '15:00', 0.8), // 80% down
        span('15:00', '18:00', 1.0), // 100% down for 3h
        span('18:00', '19:00', 0.8), // 80% down
        span('19:00', '20:00', 0.6) //  60% down
      ])

      // Use duration of span as span value (in seconds)
      const durations = Spans.map(downs, Spans.Mappers.duration)

      // Get total of downtime in seconds
      const downtime = Spans.Aggregators.sum(durations)
      expect(downtime).toEqual(13 * 3600) // 13h

      // Calculate availability
      const avail = 100 - (downtime / (24 * 3600)) * 100
      expect(avail).toBeCloseTo(45.83)
    })
  })

  describe('Percentage Model (> 75%)', () => {
    it('counts as down if more than 75% CIs are down', () => {
      // Calculate percentage of affected CIs
      const ratios = Spans.aggregate(spans, Spans.Aggregators.ratio(sof.length))

      // Get all spans where outage is 100%
      const downs = ratios.filter(span => (span.value || 0) > 0.75)
      expect(downs).toEqual([
        span('03:00', '04:00', 0.8), // 80% down
        span('04:00', '06:00', 1.0), // 100% down for 2h
        span('06:00', '07:00', 0.8), // 80% down
        span('14:00', '15:00', 0.8), // 80% down
        span('15:00', '18:00', 1.0), // 100% down for 3h
        span('18:00', '19:00', 0.8) // 80% down
      ])

      // Use duration of span as span value (in seconds)
      const durations = Spans.map(downs, Spans.Mappers.duration)

      // Get total of downtime in seconds
      const downtime = Spans.Aggregators.sum(durations)
      expect(downtime).toEqual(9 * 3600) // 9h

      // Calculate availability
      const avail = 100 - (downtime / (24 * 3600)) * 100
      expect(avail).toBeCloseTo(62.5)
    })
  })
})
