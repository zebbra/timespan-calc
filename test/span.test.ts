import { span } from './helpers'
import { Span } from '../src'

describe('Span', () => {
  describe('#intersect', () => {
    const a = span('04:00', '16:00', 'A')

    test('overlapping', () => {
      const b1 = span('02:00', '10:00')
      expect(Span.intersect(a, b1)).toEqual(span('04:00', '10:00', 'A'))

      const b2 = span('12:00', '16:00')
      expect(Span.intersect(a, b2)).toEqual(span('12:00', '16:00', 'A'))
    })

    test('non-overlapping', () => {
      const b = span('16:00', '23:00')
      expect(Span.intersect(a, b)).toEqual(null)
    })

    test('contained', () => {
      const b = span('03:00', '17:00')
      expect(Span.intersect(a, b)).toEqual(a)
    })
  })

  describe('#subtract', () => {
    const a = span('04:00', '16:00', 'A')

    test('overlapping', () => {
      const b1 = span('02:00', '10:00')
      expect(Span.subtract(a, b1)).toEqual([
        span('10:00', '16:00', 'A') //
      ])

      const b2 = span('12:00', '16:00')
      expect(Span.subtract(a, b2)).toEqual([
        span('04:00', '12:00', 'A') //
      ])
    })

    test('non-overlapping', () => {
      const b = span('16:00', '23:00')
      expect(Span.subtract(a, b)).toEqual([a])
    })

    test('contained', () => {
      const b = span('03:00', '17:00')
      expect(Span.subtract(a, b)).toEqual([])
    })

    test('split', () => {
      const b = span('05:00', '15:00')
      expect(Span.subtract(a, b)).toEqual([
        span('04:00', '05:00', 'A'), //
        span('15:00', '16:00', 'A') //
      ])
    })
  })
})
