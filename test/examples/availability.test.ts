import { Schedule, ValueSpan, Operations, Aggregators, Mappers, MapperFn } from '../../src'
import flatten from 'lodash/flatten'
import { span, hours } from '../helpers'

describe('Availability Models', () => {
  type CI = Schedule
  type SOF = Array<CI>

  const ci1 = [span('00:00', '06:00'), span('11:00', '18:00')]
  const ci2 = [span('01:00', '07:00'), span('12:00', '19:00')]
  const ci3 = [span('02:00', '08:00'), span('13:00', '20:00')]
  const ci4 = [span('03:00', '09:00'), span('14:00', '21:00')]
  const ci5 = [span('04:00', '10:00'), span('15:00', '22:00')]

  const sof: SOF = [ci1, ci2, ci3, ci4, ci5]

  // Merge overlapping spans per CI then merge spans from all CIs
  // after which: number of overlapping spans => number of CIs down
  let spans = flatten(sof.map(ci => Operations.flatten(ci)))

  // Subtract maintanance windows
  spans = Operations.subtract(spans, [
    span('00:00', '01:00'), // 1
    span('01:00', '02:00'), // 1
    span('04:00', '06:00'), // 2
    span('08:00', '10:00') //  3
  ])

  // Intersect with Business Hours
  spans = Operations.intersect(spans, [
    span('02:00', '08:00'), // 1
    span('13:00', '20:00') // 2
  ])

  describe('All Model', () => {
    it('counts as down if all CIs are down', () => {
      // Calculate percentage of affected CIs
      const ratios = Operations.aggregate(spans, Aggregators.ratio(sof.length))

      // Get all spans where outage is 100%
      const downs = ratios.filter(span => span.value === 1)
      expect(downs).toEqual([
        // span('04:00', '06:00', 1.0), // 100% down
        span('15:00', '18:00', 1.0) //  100% down
      ])

      // Use duration of span as span value (in seconds)
      const durations = Operations.map(downs, Mappers.duration)
      expect(durations).toEqual([
        // span('04:00', '06:00', 2 * hours), // 2h
        span('15:00', '18:00', 3 * hours) //  3h
      ])

      // Get total of downtime in seconds
      const downtime = Aggregators.sum(durations)
      expect(downtime).toEqual(3 * hours) // 3h

      // Calculate availability
      const avail = 100 - (downtime / (24 * hours)) * 100
      expect(avail).toBeCloseTo(87.5)
    })
  })

  describe('More-than-one Model', () => {
    it('counts as down if more than one CIs is down', () => {
      // Count overlapping spans => number of CIs down
      const counts = Operations.aggregate(spans, Aggregators.count)

      // Get all spans where count > 1
      const downs = Operations.flatten(counts.filter(span => span.value > 1))
      expect(downs).toEqual([
        span('02:00', '04:00'), //
        span('06:00', '08:00'), //
        span('13:00', '20:00') //
      ])

      // Use duration of span as span value (in seconds)
      const durations = Operations.map(downs, Mappers.duration)
      expect(durations).toEqual([
        span('02:00', '04:00', 2 * hours), //
        span('06:00', '08:00', 2 * hours), //
        span('13:00', '20:00', 7 * hours) //
      ])

      // Get total of downtime in seconds
      const downtime = Aggregators.sum(durations)
      expect(downtime).toEqual(11 * hours)

      // Calculate availability
      const avail = 100 - (downtime / (24 * hours)) * 100
      expect(avail).toBeCloseTo(54.17)
    })
  })

  describe('Downtime-ratio Model', () => {
    it('calculates availabilty based on duration and ratio of down CIs', () => {
      // Calculate percentage of affected CIs
      const ratios = Operations.aggregate(spans, Aggregators.ratio(sof.length))

      // Create mapper which multiplies duration based on ratio of down CIs
      const mapper: MapperFn<ValueSpan<number>, ValueSpan<number>> = span => {
        const duration = (span.end.valueOf() - span.start.valueOf()) / 1000
        return [{ ...span, value: span.value * duration }]
      }

      // Use partial duration of span as span value (in seconds)
      const durations = Operations.map(ratios, mapper)
      expect(durations).toEqual([
        span('02:00', '03:00', hours * 0.6),
        span('03:00', '04:00', hours * 0.8),

        span('06:00', '07:00', hours * 0.8),
        span('07:00', '08:00', hours * 0.6),

        span('13:00', '14:00', hours * 0.6),
        span('14:00', '15:00', hours * 0.8),
        span('15:00', '18:00', hours * 1.0 * 3), // 3h
        span('18:00', '19:00', hours * 0.8),
        span('19:00', '20:00', hours * 0.6)
      ])

      // Get total of downtime in seconds
      const downtime = Aggregators.sum(durations)
      expect(downtime).toEqual(8.6 * hours)

      // Calculate availability
      const avail = 100 - (downtime / (24 * hours)) * 100
      expect(avail).toBeCloseTo(64.17)
    })
  })

  describe('Percentage Model (> 50%)', () => {
    it('counts as down if more than 50% CIs are down', () => {
      // Calculate percentage of affected CIs
      const ratios = Operations.aggregate(spans, Aggregators.ratio(sof.length))

      // Get all spans where outage is 100%
      const downs = ratios.filter(span => span.value > 0.5)
      expect(downs).toEqual([
        span('02:00', '03:00', 0.6), // 60% down
        span('03:00', '04:00', 0.8), // 80% down

        span('06:00', '07:00', 0.8), // 80% down
        span('07:00', '08:00', 0.6), // 60% down

        span('13:00', '14:00', 0.6), // 60% down
        span('14:00', '15:00', 0.8), // 80% down
        span('15:00', '18:00', 1.0), // 100% down for 3h
        span('18:00', '19:00', 0.8), // 80% down
        span('19:00', '20:00', 0.6) //  60% down
      ])

      // Use duration of span as span value (in seconds)
      const durations = Operations.map(downs, Mappers.duration)

      // Get total of downtime in seconds
      const downtime = Aggregators.sum(durations)
      expect(downtime).toEqual(11 * hours) // 13h

      // Calculate availability
      const avail = 100 - (downtime / (24 * hours)) * 100
      expect(avail).toBeCloseTo(54.17)
    })
  })

  describe('Percentage Model (> 75%)', () => {
    it('counts as down if more than 75% CIs are down', () => {
      // Calculate percentage of affected CIs
      const ratios = Operations.aggregate(spans, Aggregators.ratio(sof.length))

      // Get all spans where outage is 100%
      const downs = ratios.filter(span => span.value > 0.75)
      expect(downs).toEqual([
        span('03:00', '04:00', 0.8), // 80% down

        span('06:00', '07:00', 0.8), // 80% down

        span('14:00', '15:00', 0.8), // 80% down
        span('15:00', '18:00', 1.0), // 100% down for 3h
        span('18:00', '19:00', 0.8) // 80% down
      ])

      // Use duration of span as span value (in seconds)
      const durations = Operations.map(downs, Mappers.duration)

      // Get total of downtime in seconds
      const downtime = Aggregators.sum(durations)
      expect(downtime).toEqual(7 * hours)

      // Calculate availability
      const avail = 100 - (downtime / (24 * hours)) * 100
      expect(avail).toBeCloseTo(70.83)
    })
  })
})
