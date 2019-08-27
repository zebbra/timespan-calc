import { Spans, Events, SpanList } from '../src/sla-calculator'
import { span, time } from './helpers'
import { flatten } from 'lodash'

describe('SLA Calculator', () => {
  describe('Events', () => {
    describe('#fromSlot', () => {
      it('generates events from a span', () => {
        const s = span('00:00', '12:00')
        expect(Events.fromSpan(s)).toEqual([
          { type: Events.Type.Started, time: s.start, span: s },
          { type: Events.Type.Ended, time: s.end, span: s }
        ])
      })
    })

    describe('#fromTrack', () => {
      it('generates chronological events from a track', () => {
        const s1 = span('00:00', '02:00')
        const s2 = span('01:00', '03:00')
        const s3 = span('02:00', '04:00')

        const track = [s3, s2, s1]

        expect(Events.fromSpans(track)).toEqual([
          { type: Events.Type.Started, time: s1.start, span: s1 },
          { type: Events.Type.Started, time: s2.start, span: s2 },
          { type: Events.Type.Ended, time: s1.end, span: s1 },
          { type: Events.Type.Started, time: s3.start, span: s3 },
          { type: Events.Type.Ended, time: s2.end, span: s2 },
          { type: Events.Type.Ended, time: s3.end, span: s3 }
        ])
      })
    })
  })

  describe('Slots', () => {
    describe('#flatten', () => {
      const track = [
        // overlapping
        span('02:00', '04:00'),
        span('03:00', '05:00'),
        // adjacent
        span('10:00', '11:00'),
        span('11:00', '12:00'),
        // isolated
        span('20:00', '21:00')
      ]

      it('merges overlapping spans', () => {
        const res = Spans.flatten(track)

        expect(res).toEqual([
          // overlapping
          span('02:00', '05:00'),
          // adjacent
          span('10:00', '12:00'),
          // isolated
          span('20:00', '21:00')
        ])
      })
    })

    describe('#aggregate', () => {
      const s1 = span('00:00', '12:00')
      const s2 = span('04:00', '06:00')
      const s3 = span('06:00', '14:00')
      const s4 = span('06:00', '14:00')

      const track = [s1, s2, s3, s4]

      describe('with Slots.Aggregators.count', () => {
        it('counts overlapping spans', () => {
          const res = Spans.aggregate(track, Spans.Aggregators.count)

          expect(res).toEqual([
            span('00:00', '04:00', 1),
            span('04:00', '06:00', 2),
            span('06:00', '12:00', 3),
            span('12:00', '14:00', 2)
          ])
        })
      })

      describe('with Slots.Aggregators.group', () => {
        it('groups overlapping spans', () => {
          const res = Spans.aggregate(track, Spans.Aggregators.identity)

          expect(res).toEqual([
            span('00:00', '04:00', [s1]),
            span('04:00', '06:00', [s1, s2]),
            span('06:00', '12:00', [s1, s3, s4]),
            span('12:00', '14:00', [s3, s4])
          ])
        })
      })

      describe('with spans.Aggregators.percentageOf', () => {
        it('groups overlapping spans', () => {
          const res = Spans.aggregate(track, Spans.Aggregators.ratio(4))

          expect(res).toEqual([
            span('00:00', '04:00', 0.25),
            span('04:00', '06:00', 0.5),
            span('06:00', '12:00', 0.75),
            span('12:00', '14:00', 0.5)
          ])
        })
      })
    })

    describe('#trim', () => {
      const track = [
        // starts before & ends after
        span('00:00', '23:00', 'A'),

        // outside
        span('00:00', '12:00', 'B'),
        span('16:00', '23:00', 'C'),

        // starts or ends in between
        span('00:00', '16:00', 'D'),
        span('00:00', '15:00', 'E'),
        span('12:00', '23:00', 'F'),
        span('13:00', '23:00', 'G')
      ]

      it('trims the spans to the given range', () => {
        const res = Spans.trim(track, time('12:00'), time('16:00'))

        expect(res).toEqual([
          span('12:00', '16:00', 'A'),
          span('12:00', '16:00', 'D'),
          span('12:00', '15:00', 'E'),
          span('12:00', '16:00', 'F'),
          span('13:00', '16:00', 'G')
        ])
      })
    })

    describe('Mappers', () => {
      describe('#duration', () => {
        it('set the values to the duration in seconds', () => {
          const track = [
            span('01:00', '02:00'), // 1h
            span('02:00', '04:00'), // 2h
            span('02:00', '05:00') //  3h
          ]

          const res = Spans.map(track, Spans.Mappers.duration)
          expect(res).toEqual([
            span('01:00', '02:00', 1 * 3600),
            span('02:00', '04:00', 2 * 3600),
            span('02:00', '05:00', 3 * 3600)
          ])
        })
      })
    })
  })

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

    describe('Redundancy Model', () => {
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
          span('04:00', '06:00', 2 * 3600), // 2h
          span('15:00', '18:00', 3 * 3600) //  3h
        ])

        // Get total of downtime in seconds
        const downtime = Spans.Aggregators.sum(durations)
        expect(downtime).toEqual(5 * 3600) // 5h

        // Calculate availability
        const avail = 100 - (downtime / (24 * 3600)) * 100
        expect(avail).toBeCloseTo(79.166)
      })
    })
  })
})
