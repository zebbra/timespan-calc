import { Schedule, Span } from '../src'
import moment = require('moment')
import Benchmark from 'benchmark'

const NUM_SCHEDULES = 100
const NUM_SPANS = 1000

let schedules: Schedule[] = []

console.log('Generating schedules ...')

for (let i = 0; i < NUM_SCHEDULES; i++) {
  let schedule: Schedule = []
  for (let n = 0; n < NUM_SPANS; n++) {
    schedule.push(getSpan())
  }
  schedules.push(schedule)
}

let suite = new Benchmark.Suite()
suite
  .add('String#indexOf', () => {
    'Hello World!'.indexOf('o') > -1
  })
  .on('cycle', (event: any) => {
    console.log(String(event.target))
  })
  .run({ async: true })

console.log('Done')

function getRandomInt(max: number) {
  return Math.floor(Math.random() * Math.floor(max))
}

function getRandomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function getSpan(): Span {
  const start = moment().add(getRandomInt(24 * 7), 'hours')
  const end = start.add(getRandomBetween(1, 10), 'hour')
  return { start, end }
}
