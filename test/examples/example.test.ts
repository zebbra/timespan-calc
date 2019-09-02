import _ from 'lodash'
import { Operations, Aggregators, Mappers } from '../../src'
import { span, hours } from '../helpers'

describe('Examples', () => {
  test('DNS Service', () => {
    // Let's assume you want to calculate the availability of a DNS service,
    // where its availability depends on the availability of a cluster of 3 DNS servers:

    // Downtimes of DNS server 1
    const dnsServer1 = [
      span('01:00', '09:00'), // 8h downtime of DNS1
      span('10:00', '12:00'), // 2h downtime of DNS1-3
      span('11:00', '13:00') //  2h downtime of DNS1
    ]

    // Downtimes of DNS server 2
    const dnsServer2 = [
      span('10:00', '12:00'), // 2h downtime of DNS1-3
      span('14:00', '18:00') //  4h downtime of DNS2
    ]

    // Downtimes of DNS server 3
    const dnsServer3 = [
      span('10:00', '12:00'), // 2h downtime of DNS1-3
      span('15:00', '19:00') //  1h downtime of DNS3
    ]

    const dnsService = [dnsServer1, dnsServer2, dnsServer3]

    // First we merge all overlapping events per server and then merge
    // all events into one array. After this step, events are only overlapping if
    // multiple servers were down.
    let events = _.flatMap(dnsService, Operations.flatten)
    expect(events).toEqual([
      // DNS1
      span('01:00', '09:00'),
      span('10:00', '13:00'),
      // DNS2
      span('10:00', '12:00'),
      span('14:00', '18:00'),
      // DNS3
      span('10:00', '12:00'),
      span('15:00', '19:00')
    ])

    // Let's assume we had a maintenance window between 9-11am,
    // so lets subtract this:
    events = Operations.subtract(events, [
      span('09:00', '11:00', 'Hardware Replacement') //
    ])
    expect(events).toEqual([
      // DNS1
      span('01:00', '09:00'),
      span('11:00', '13:00'), // Shortened because of maintanance
      // DNS2
      span('11:00', '12:00'), // Shortened because of maintanance
      span('14:00', '18:00'),
      // DNS3
      span('11:00', '12:00'), // Shortened because of maintanance
      span('15:00', '19:00')
    ])

    // Next, we want to count the number of servers which were down at the same time.
    // To achieve this we merge all overlapping events and set the value of the resulting event
    // to the number of overlapping events:
    let counts = Operations.aggregate(events, Aggregators.count)
    expect(counts).toEqual([
      span('01:00', '09:00', 1), // DNS1
      span('11:00', '12:00', 3), // DNS1, DNS2, DNS3
      span('12:00', '13:00', 1), // DNS1
      span('14:00', '15:00', 1), // DNS2
      span('15:00', '18:00', 2), // DNS2, DNS3
      span('18:00', '19:00', 1) //  DNS3
    ])

    // Let's assume our SLA agreement states that availability is only guaranteed
    // during business hours. So lets only include events during business hours:
    counts = Operations.intersect(counts, [
      span('09:00', '12:00'), // Morning
      span('13:00', '17:00') // Afternoon
    ])
    expect(counts).toEqual([
      span('11:00', '12:00', 3), // DNS1, DNS2, DNS3
      span('14:00', '15:00', 1), // DNS2
      span('15:00', '17:00', 2) //  DNS2, DNS3
    ])

    // Let's assume our DNS service is down if more than 1 DNS server is down:
    counts = counts.filter(s => s.value > 1)
    expect(counts).toEqual([
      span('11:00', '12:00', 3), // DNS1, DNS2, DNS3
      span('15:00', '17:00', 2) //  DNS2, DNS3
    ])

    // Then calculate the duration for each event
    const durations = Operations.map(counts, Mappers.duration)
    expect(durations).toEqual([
      span('11:00', '12:00', 1 * hours), // DNS1, DNS2, DNS3
      span('15:00', '17:00', 2 * hours) //  DNS2, DNS3
    ])

    // Calculate the total downtime
    const downtime = Aggregators.sum(durations)
    expect(downtime).toEqual(3 * hours)

    // We could also calculate the service availability for a time period
    const coverage = Operations.coverage(durations, span('09:00', '18:00'))
    expect(coverage).toBeCloseTo(0.33) // 3 of 9 hours

    const availability = 1 - coverage
    expect(availability).toBeCloseTo(0.67) // 6 of 9 hours
  })
})
