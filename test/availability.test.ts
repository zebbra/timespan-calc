import flatten from 'lodash/flatten'

import { Slots, Track, Slot } from '../src/sla-calculator'
import { slot, hours } from './helpers'

describe('Availability Models', () => {
  type CI = Track
  type SOF = Array<CI>

  const ci1 = [slot('00:00', '06:00'), slot('11:00', '18:00')]
  const ci2 = [slot('01:00', '07:00'), slot('12:00', '19:00')]
  const ci3 = [slot('02:00', '08:00'), slot('13:00', '20:00')]
  const ci4 = [slot('03:00', '09:00'), slot('14:00', '21:00')]
  const ci5 = [slot('04:00', '10:00'), slot('15:00', '22:00')]

  const sof: SOF = [ci1, ci2, ci3, ci4, ci5]

  // Merge overlapping slots per CI then merge slots from all CIs
  // after which: number of overlapping slots => number of CIs down
  const slots = flatten(sof.map(ci => Slots.flatten(ci)))

  describe('All Model', () => {
    it('counts as down if all CIs are down', () => {
      // Calculate percentage of affected CIs
      const ratios = Slots.aggregate(slots, Slots.Aggregators.ratio(sof.length))

      // Get all slots where outage is 100%
      const downs = ratios.filter(slot => slot.value === 1)
      expect(downs).toEqual([
        slot('04:00', '06:00', 1.0), // 100% down
        slot('15:00', '18:00', 1.0) //  100% down
      ])

      // Use duration of slot as slot value (in seconds)
      const durations = Slots.map(downs, Slots.Mappers.duration)
      expect(durations).toEqual([
        slot('04:00', '06:00', 2 * hours), // 2h
        slot('15:00', '18:00', 3 * hours) //  3h
      ])

      // Get total of downtime in seconds
      const downtime = Slots.Aggregators.sum(durations)
      expect(downtime).toEqual(5 * hours) // 5h

      // Calculate availability
      const avail = 100 - (downtime / (24 * hours)) * 100
      expect(avail).toBeCloseTo(79.166)
    })
  })

  describe('More-than-one Model', () => {
    it('counts as down if more than one CIs is down', () => {
      // Count overlapping slots => number of CIs down
      const counts = Slots.aggregate(slots, Slots.Aggregators.count)

      // Get all slots where count > 1
      const downs = Slots.flatten(counts.filter(slot => slot.value! > 1))
      expect(downs).toEqual([
        slot('01:00', '09:00'), //
        slot('12:00', '21:00') //
      ])

      // Use duration of slot as slot value (in seconds)
      const durations = Slots.map(downs, Slots.Mappers.duration)
      expect(durations).toEqual([
        slot('01:00', '09:00', 8 * 3600), // 8h
        slot('12:00', '21:00', 9 * 3600) // 9h
      ])

      // Get total of downtime in seconds
      const downtime = Slots.Aggregators.sum(durations)
      expect(downtime).toEqual(17 * 3600) // 17h

      // Calculate availability
      const avail = 100 - (downtime / (24 * 3600)) * 100
      expect(avail).toBeCloseTo(29.166)
    })
  })

  describe('Downtime-ratio Model', () => {
    it('calculates availabilty based on duration and ratio of down CIs', () => {
      // Calculate percentage of affected CIs
      const ratios = Slots.aggregate(slots, Slots.Aggregators.ratio(sof.length))

      // Create mapper which multiplies duration based on ratio of down CIs
      const mapper: Slots.Mappers.MapperFn<number, number> = (slot: Slot<number>) => {
        const duration = (slot.end.valueOf() - slot.start.valueOf()) / 1000
        return { ...slot, value: (slot.value || 0) * duration }
      }

      // Use partial duration of slot as slot value (in seconds)
      const durations = Slots.map(ratios, mapper)
      expect(durations).toEqual([
        slot('00:00', '01:00', 3600 * 0.2),
        slot('01:00', '02:00', 3600 * 0.4),
        slot('02:00', '03:00', 3600 * 0.6),
        slot('03:00', '04:00', 3600 * 0.8),
        slot('04:00', '06:00', 3600 * 1.0 * 2), // 2h
        slot('06:00', '07:00', 3600 * 0.8),
        slot('07:00', '08:00', 3600 * 0.6),
        slot('08:00', '09:00', 3600 * 0.4),
        slot('09:00', '10:00', 3600 * 0.2),
        slot('11:00', '12:00', 3600 * 0.2),
        slot('12:00', '13:00', 3600 * 0.4),
        slot('13:00', '14:00', 3600 * 0.6),
        slot('14:00', '15:00', 3600 * 0.8),
        slot('15:00', '18:00', 3600 * 1.0 * 3), // 3h
        slot('18:00', '19:00', 3600 * 0.8),
        slot('19:00', '20:00', 3600 * 0.6),
        slot('20:00', '21:00', 3600 * 0.4),
        slot('21:00', '22:00', 3600 * 0.2)
      ])

      // Get total of downtime in seconds
      const downtime = Slots.Aggregators.sum(durations)
      expect(downtime).toEqual(13 * 3600) // 13h

      // Calculate availability
      const avail = 100 - (downtime / (24 * 3600)) * 100
      expect(avail).toBeCloseTo(45.83)
    })
  })

  describe('Percentage Model (> 50%)', () => {
    it('counts as down if more than 50% CIs are down', () => {
      // Calculate percentage of affected CIs
      const ratios = Slots.aggregate(slots, Slots.Aggregators.ratio(sof.length))

      // Get all slots where outage is 100%
      const downs = ratios.filter(slot => (slot.value || 0) > 0.5)
      expect(downs).toEqual([
        slot('02:00', '03:00', 0.6), // 60% down
        slot('03:00', '04:00', 0.8), // 80% down
        slot('04:00', '06:00', 1.0), // 100% down for 2h
        slot('06:00', '07:00', 0.8), // 80% down
        slot('07:00', '08:00', 0.6), //  60% down

        slot('13:00', '14:00', 0.6), // 60% down
        slot('14:00', '15:00', 0.8), // 80% down
        slot('15:00', '18:00', 1.0), // 100% down for 3h
        slot('18:00', '19:00', 0.8), // 80% down
        slot('19:00', '20:00', 0.6) //  60% down
      ])

      // Use duration of slot as slot value (in seconds)
      const durations = Slots.map(downs, Slots.Mappers.duration)

      // Get total of downtime in seconds
      const downtime = Slots.Aggregators.sum(durations)
      expect(downtime).toEqual(13 * 3600) // 13h

      // Calculate availability
      const avail = 100 - (downtime / (24 * 3600)) * 100
      expect(avail).toBeCloseTo(45.83)
    })
  })

  describe('Percentage Model (> 75%)', () => {
    it('counts as down if more than 75% CIs are down', () => {
      // Calculate percentage of affected CIs
      const ratios = Slots.aggregate(slots, Slots.Aggregators.ratio(sof.length))

      // Get all slots where outage is 100%
      const downs = ratios.filter(slot => (slot.value || 0) > 0.75)
      expect(downs).toEqual([
        slot('03:00', '04:00', 0.8), // 80% down
        slot('04:00', '06:00', 1.0), // 100% down for 2h
        slot('06:00', '07:00', 0.8), // 80% down
        slot('14:00', '15:00', 0.8), // 80% down
        slot('15:00', '18:00', 1.0), // 100% down for 3h
        slot('18:00', '19:00', 0.8) // 80% down
      ])

      // Use duration of slot as slot value (in seconds)
      const durations = Slots.map(downs, Slots.Mappers.duration)

      // Get total of downtime in seconds
      const downtime = Slots.Aggregators.sum(durations)
      expect(downtime).toEqual(9 * 3600) // 9h

      // Calculate availability
      const avail = 100 - (downtime / (24 * 3600)) * 100
      expect(avail).toBeCloseTo(62.5)
    })
  })
})
