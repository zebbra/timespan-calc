import { Slots, Events, Track } from '../src/sla-calculator'
import { slot, time } from './helpers'
import { flatten } from 'lodash'

describe('SLA Calculator', () => {
  describe('Events', () => {
    describe('#fromSlot', () => {
      it('generates events from a slot', () => {
        const s = slot('00:00', '12:00')
        expect(Events.fromSlot(s)).toEqual([
          { type: Events.Type.Started, time: s.start, slot: s },
          { type: Events.Type.Ended, time: s.end, slot: s }
        ])
      })
    })

    describe('#fromTrack', () => {
      it('generates chronological events from a track', () => {
        const s1 = slot('00:00', '02:00')
        const s2 = slot('01:00', '03:00')
        const s3 = slot('02:00', '04:00')

        const track = [s3, s2, s1]

        expect(Events.fromTrack(track)).toEqual([
          { type: Events.Type.Started, time: s1.start, slot: s1 },
          { type: Events.Type.Started, time: s2.start, slot: s2 },
          { type: Events.Type.Ended, time: s1.end, slot: s1 },
          { type: Events.Type.Started, time: s3.start, slot: s3 },
          { type: Events.Type.Ended, time: s2.end, slot: s2 },
          { type: Events.Type.Ended, time: s3.end, slot: s3 }
        ])
      })
    })
  })

  describe('Slots', () => {
    describe('#flatten', () => {
      const track = [
        // overlapping
        slot('02:00', '04:00'),
        slot('03:00', '05:00'),
        // adjacent
        slot('10:00', '11:00'),
        slot('11:00', '12:00'),
        // isolated
        slot('20:00', '21:00')
      ]

      it('merges overlapping slots', () => {
        const res = Slots.flatten(track)

        expect(res).toEqual([
          // overlapping
          slot('02:00', '05:00'),
          // adjacent
          slot('10:00', '12:00'),
          // isolated
          slot('20:00', '21:00')
        ])
      })
    })

    describe('#aggregate', () => {
      const s1 = slot('00:00', '12:00')
      const s2 = slot('04:00', '06:00')
      const s3 = slot('06:00', '14:00')
      const s4 = slot('06:00', '14:00')

      const track = [s1, s2, s3, s4]

      describe('with Slots.Aggregators.count', () => {
        it('counts overlapping slots', () => {
          const res = Slots.aggregate(track, Slots.Aggregators.count)

          expect(res).toEqual([
            slot('00:00', '04:00', 1),
            slot('04:00', '06:00', 2),
            slot('06:00', '12:00', 3),
            slot('12:00', '14:00', 2)
          ])
        })
      })

      describe('with Slots.Aggregators.group', () => {
        it('groups overlapping slots', () => {
          const res = Slots.aggregate(track, Slots.Aggregators.group)

          expect(res).toEqual([
            slot('00:00', '04:00', [s1]),
            slot('04:00', '06:00', [s1, s2]),
            slot('06:00', '12:00', [s1, s3, s4]),
            slot('12:00', '14:00', [s3, s4])
          ])
        })
      })

      describe('with slots.Aggregators.percentageOf', () => {
        it('groups overlapping slots', () => {
          const res = Slots.aggregate(track, Slots.Aggregators.ratio(4))

          expect(res).toEqual([
            slot('00:00', '04:00', 0.25),
            slot('04:00', '06:00', 0.5),
            slot('06:00', '12:00', 0.75),
            slot('12:00', '14:00', 0.5)
          ])
        })
      })
    })

    describe('#trim', () => {
      const track = [
        // starts before & ends after
        slot('00:00', '23:00', 'A'),

        // outside
        slot('00:00', '12:00', 'B'),
        slot('16:00', '23:00', 'C'),

        // starts or ends in between
        slot('00:00', '16:00', 'D'),
        slot('00:00', '15:00', 'E'),
        slot('12:00', '23:00', 'F'),
        slot('13:00', '23:00', 'G')
      ]

      it('trims the slots to the given range', () => {
        const res = Slots.trim(track, time('12:00'), time('16:00'))

        expect(res).toEqual([
          slot('12:00', '16:00', 'A'),
          slot('12:00', '16:00', 'D'),
          slot('12:00', '15:00', 'E'),
          slot('12:00', '16:00', 'F'),
          slot('13:00', '16:00', 'G')
        ])
      })
    })

    describe('Mappers', () => {
      describe('#duration', () => {
        it('set the values to the duration in seconds', () => {
          const track = [
            slot('01:00', '02:00'), // 1h
            slot('02:00', '04:00'), // 2h
            slot('02:00', '05:00') //  3h
          ]

          const res = Slots.map(track, Slots.Mappers.duration)
          expect(res).toEqual([
            slot('01:00', '02:00', 1 * 3600),
            slot('02:00', '04:00', 2 * 3600),
            slot('02:00', '05:00', 3 * 3600)
          ])
        })
      })
    })
  })

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

    describe('Redundancy Model', () => {
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
          slot('04:00', '06:00', 2 * 3600), // 2h
          slot('15:00', '18:00', 3 * 3600) //  3h
        ])

        // Get total of downtime in seconds
        const downtime = Slots.Aggregators.sum(durations)
        expect(downtime).toEqual(5 * 3600) // 5h

        // Calculate availability
        const avail = 100 - (downtime / (24 * 3600)) * 100
        expect(avail).toBeCloseTo(79.166)
      })
    })
  })
})
