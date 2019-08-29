import { Mappers, Span } from '../src'
import { span, normalizeSpans } from './helpers'

describe('Mappers', () => {
  describe('#subtractor', () => {
    const subtract = (a: Span, b: Span | Span[]) => normalizeSpans(Mappers.subtractor(b)(a))

    const a = span('06:00', '18:00', 'A')

    describe('from a span A using a single span B', () => {
      test('when span A start is overlapped by B', () => {
        const b = span('04:00', '10:00')
        expect(subtract(a, b)).toEqual([
          span('10:00', '18:00', 'A') //
        ])
      })

      test('when span A end is overlapped by B', () => {
        const b = span('16:00', '20:00')
        expect(subtract(a, b)).toEqual([
          span('06:00', '16:00', 'A') //
        ])
      })

      test('when span A is outside B', () => {
        const b = span('18:00', '20:00')
        expect(subtract(a, b)).toEqual([a])
      })

      test('when span B is covered by A', () => {
        const b = span('08:00', '14:00')
        expect(subtract(a, b)).toEqual([
          span('06:00', '08:00', 'A'), //
          span('14:00', '18:00', 'A') //
        ])
      })
    })

    test('from a span A using multiple spans B', () => {
      const b = [
        span('02:00', '04:00'),
        span('05:00', '07:00'),
        span('09:00', '10:00'),
        span('10:00', '12:00'),
        span('13:00', '14:00'),
        span('17:00', '18:00')
      ]

      expect(subtract(a, b)).toEqual([
        span('07:00', '09:00', 'A'), //
        span('12:00', '13:00', 'A'), //
        span('14:00', '17:00', 'A') //
      ])
    })
  })

  describe('#intersector', () => {
    const intersect = (a: Span, b: Span | Span[]) => normalizeSpans(Mappers.intersector(b)(a))

    const a = span('06:00', '18:00', 'A')

    describe('from a span A using a single span B', () => {
      test('when span A start is overlapped by B', () => {
        const b = span('04:00', '10:00')
        expect(intersect(a, b)).toEqual([
          span('06:00', '10:00', 'A') //
        ])
      })
    })
  })
})
