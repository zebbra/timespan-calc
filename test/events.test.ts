import { span } from './helpers'
import { Events } from '../src'

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

      expect(Events.fromSchedule(track)).toEqual([
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
