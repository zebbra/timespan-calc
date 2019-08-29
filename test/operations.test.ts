import { span, time, hours } from './helpers'

import { Operations, Aggregators, Mappers } from '../src'

describe('Operations', () => {
  describe('#flatten', () => {
    const schedule = [
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
      const res = Operations.flatten(schedule)

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

  describe('#trim', () => {
    const schedule = [
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
      const res = Operations.trim(schedule, time('12:00'), time('16:00'))

      expect(res).toEqual([
        span('12:00', '16:00', 'A'),
        span('12:00', '16:00', 'D'),
        span('12:00', '15:00', 'E'),
        span('12:00', '16:00', 'F'),
        span('13:00', '16:00', 'G')
      ])
    })
  })

  describe('#aggregate', () => {
    const s1 = span('00:00', '12:00')
    const s2 = span('04:00', '06:00')
    const s3 = span('06:00', '14:00')
    const s4 = span('06:00', '14:00')

    const schedule = [s1, s2, s3, s4]

    describe('with Slots.Aggregators.identity', () => {
      it('groups overlapping spans', () => {
        const res = Operations.aggregate(schedule, Aggregators.identity)

        expect(res).toEqual([
          span('00:00', '04:00', [s1]),
          span('04:00', '06:00', [s1, s2]),
          span('06:00', '12:00', [s1, s3, s4]),
          span('12:00', '14:00', [s3, s4])
        ])
      })
    })

    describe('with Slots.Aggregators.count', () => {
      it('counts overlapping spans', () => {
        const res = Operations.aggregate(schedule, Aggregators.count)

        expect(res).toEqual([
          span('00:00', '04:00', 1),
          span('04:00', '06:00', 2),
          span('06:00', '12:00', 3),
          span('12:00', '14:00', 2)
        ])
      })
    })

    describe('with spans.Aggregators.ratio', () => {
      it('groups overlapping spans', () => {
        const res = Operations.aggregate(schedule, Aggregators.ratio(4))

        expect(res).toEqual([
          span('00:00', '04:00', 0.25),
          span('04:00', '06:00', 0.5),
          span('06:00', '12:00', 0.75),
          span('12:00', '14:00', 0.5)
        ])
      })
    })
  })

  describe('#map', () => {
    describe('with Mappers.duration', () => {
      it('set the values to the duration in seconds', () => {
        const schedule = [
          span('01:00', '02:00'), // 1h
          span('02:00', '04:00'), // 2h
          span('02:00', '05:00') //  3h
        ]

        const res = Operations.map(schedule, Mappers.duration)
        expect(res).toEqual([
          span('01:00', '02:00', 1 * hours),
          span('02:00', '04:00', 2 * hours),
          span('02:00', '05:00', 3 * hours)
        ])
      })
    })
  })

  test('#subtract', () => {
    const a = [
      span('01:00', '08:00', 'A'),
      span('09:00', '13:00', 'B'),
      span('16:00', '22:00', 'C')
    ]

    const b = [
      span('01:00', '02:00'),
      span('02:00', '04:00'),
      span('12:00', '17:00'),
      span('19:00', '20:00'),
      span('21:00', '23:00')
    ]

    const res = Operations.subtract(a, b)
    expect(res).toEqual([
      span('04:00', '08:00', 'A'),
      span('09:00', '12:00', 'B'),
      span('17:00', '19:00', 'C'),
      span('20:00', '21:00', 'C')
    ])
  })

  test('#intersect', () => {
    const a = [
      span('01:00', '16:00', 'A'),
      span('08:00', '16:00', 'B'),
      span('08:00', '20:00', 'C')
    ]

    const b = [
      span('00:00', '05:00'),
      span('08:00', '09:00'),
      span('15:00', '21:00'),
      span('20:00', '21:00')
    ]

    const res = Operations.intersect(a, b)
    expect(res).toEqual([
      span('01:00', '05:00', 'A'),
      span('08:00', '09:00', 'A'),
      span('15:00', '16:00', 'A'),
      span('08:00', '09:00', 'B'),
      span('15:00', '16:00', 'B'),
      span('08:00', '09:00', 'C'),
      span('15:00', '20:00', 'C')
    ])
  })
})
