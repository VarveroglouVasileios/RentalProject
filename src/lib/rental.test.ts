import { describe, expect, it } from 'vitest'
import {
  advanceFor, cents, freeUnits, makeRef, overlaps, priceFor, scooterDiscount, stamp, startOptions, unitIsFree, validate, window,
  type Product, type Rental, type Unit,
} from './rental'

const boat: Product = { kind: 'boat', name: 'Σκάφος', blurb: '', image: '', prices: { '2h': 70, '4h': 120, day: 190 }, deposit: 100, needsLicense: false, seats: 5 }
const scooter: Product = { kind: 'scooter', name: 'Scooter', blurb: '', image: '', prices: { day: 25 }, deposit: 80, needsLicense: true, seats: 2 }
const units: Unit[] = [
  { id: 'b1', kind: 'boat', name: 'Σκάφος 1' }, { id: 'b2', kind: 'boat', name: 'Σκάφος 2' },
  { id: 's1', kind: 'scooter', name: 'Scooter 1' }, { id: 's2', kind: 'scooter', name: 'Scooter 2' },
]
const D = '2026-08-15'
const early = new Date('2026-08-10T08:00:00')
const rental = (over: Partial<Rental>): Rental => ({
  id: 'r', ref: 'BW-0001', unitId: 'b1', kind: 'boat', start: stamp(D, '10:00'), end: stamp(D, '12:00'), days: 1, duration: '2h',
  name: 'Τ Τ', phone: '6900000000', total: 7000, advance: 2100, status: 'booked', createdAt: 0, ...over,
})

describe('pricing', () => {
  it('prices boats per block and scooters per day with a long-rental discount', () => {
    expect(priceFor(boat, '2h')).toBe(7000)
    expect(priceFor(boat, '4h')).toBe(12000)
    expect(priceFor(boat, 'day')).toBe(19000)
    expect(priceFor(scooter, 'days', 1)).toBe(2500)
    expect(priceFor(scooter, 'days', 3)).toBe(6750) // 3 × 25 − 10%
    expect(priceFor(scooter, 'days', 7)).toBe(14000) // 7 × 25 − 20%
    expect(scooterDiscount(2)).toBe(0)
  })

  it('rounds the advance to whole cents', () => {
    expect(advanceFor(12000)).toBe(3600)
    expect(advanceFor(6750)).toBe(2025)
    expect(cents(0.1 + 0.2)).toBe(30)
  })
})

describe('opening hours', () => {
  it('keeps boats inside 09:00–20:00 and scooters collectable until 19:00', () => {
    expect(window('boat', D, '09:00', '2h', 1)).not.toBeNull()
    expect(window('boat', D, '18:00', '2h', 1)).not.toBeNull()
    expect(window('boat', D, '18:30', '2h', 1)).toBeNull() // would end after 20:00
    expect(window('boat', D, '08:30', '2h', 1)).toBeNull()
    expect(window('boat', D, '09:00', 'day', 1)).not.toBeNull()
    expect(window('boat', D, '10:00', 'day', 1)).toBeNull() // a full day is 11 hours
    expect(window('scooter', D, '19:00', 'days', 2)).not.toBeNull()
    expect(window('scooter', D, '19:30', 'days', 2)).toBeNull()
  })

  it('spans whole days for scooters', () => {
    const w = window('scooter', D, '10:00', 'days', 3)!
    expect(w[1] - w[0]).toBe(3 * 24 * 60)
  })
})

describe('availability', () => {
  it('treats back-to-back as free for scooters but keeps a turnaround for boats', () => {
    const s = stamp(D, '10:00'), e = stamp(D, '12:00')
    expect(overlaps(e, e + 120, s, e)).toBe(false)
    const boatBooked = [rental({})]
    expect(unitIsFree(units[0], boatBooked, e, e + 120)).toBe(false) // inside the 30 minute turnaround
    expect(unitIsFree(units[0], boatBooked, e + 30, e + 150)).toBe(true)
    const scooterBooked = [rental({ id: 'x', unitId: 's1', kind: 'scooter', start: s, end: e })]
    expect(unitIsFree(units[2], scooterBooked, e, e + 600)).toBe(true)
  })

  it('ignores cancelled and returned rentals', () => {
    const s = stamp(D, '10:00'), e = stamp(D, '12:00')
    expect(unitIsFree(units[0], [rental({ status: 'cancelled' })], s, e)).toBe(true)
    expect(unitIsFree(units[0], [rental({ status: 'returned' })], s, e)).toBe(true)
    expect(unitIsFree(units[0], [rental({ status: 'out' })], s, e)).toBe(false)
  })

  it('counts the free units of a kind', () => {
    const s = stamp(D, '10:00'), e = stamp(D, '12:00')
    expect(freeUnits(units, 'boat', [], s, e)).toHaveLength(2)
    expect(freeUnits(units, 'boat', [rental({})], s, e).map((u) => u.id)).toEqual(['b2'])
    expect(freeUnits(units, 'boat', [rental({}), rental({ id: 'y', unitId: 'b2' })], s, e)).toHaveLength(0)
  })

  it('lists start times with free counts and drops those without notice or without a boat', () => {
    const rentals = [rental({}), rental({ id: 'y', unitId: 'b2' })]
    const opts = startOptions({ units, kind: 'boat', date: D, duration: '2h', days: 1, rentals, now: early })
    expect(opts.find((o) => o.time === '10:00')?.free).toBe(0)
    expect(opts.find((o) => o.time === '14:00')?.free).toBe(2)
    expect(opts.at(-1)?.time).toBe('18:00')
    const sameDay = startOptions({ units, kind: 'boat', date: D, duration: '2h', days: 1, rentals: [], now: new Date('2026-08-15T11:10:00') })
    expect(sameDay[0].time).toBe('12:30')
  })
})

describe('validation', () => {
  const ok = { name: 'Νίκος Παπάς', phone: '+30 691 234 5678', license: true, needsLicense: true, days: 2, kind: 'scooter' as const, time: '10:00' }
  it('accepts a complete scooter request', () => expect(validate(ok)).toEqual({}))
  it('requires a licence only when needed', () => {
    expect(validate({ ...ok, license: false }).license).toBeDefined()
    expect(validate({ ...ok, license: false, needsLicense: false, kind: 'boat' }).license).toBeUndefined()
  })
  it('rejects bad names, phones, days and a missing time', () => {
    const e = validate({ ...ok, name: 'Νίκος', phone: '12', days: 20, time: '' })
    expect(Object.keys(e).sort()).toEqual(['days', 'name', 'phone', 'slot'])
  })
  it('numbers references', () => expect(makeRef(12)).toBe('BW-0012'))
})
