import moment from 'moment'
import { Slot } from '../src/sla-calculator'

export function slot(start: string, end: string, value?: any): Slot {
  return {
    start: time(start),
    end: time(end),
    value
  }
}

export function time(time: string) {
  return moment.utc(`2000-01-01 ${time}:00`)
}

export const hours = 3600
