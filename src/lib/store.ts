import { ref, watch } from 'vue'
import { load, save } from './storage'
import {
  addDays, advanceFor, freeUnits, makeRef, nowStamp, priceFor, toISO, validate, window,
  type Duration, type Errors, type Kind, type Rental,
} from './rental'
import { products, units } from '@/data/fleet'

const KEYS = { rentals: 'bluewake.rentals.v1', seq: 'bluewake.seq.v1' }

function seed(now: Date): Rental[] {
  const today = toISO(now)
  const mk = (n: number, unitId: string, kind: Kind, date: string, time: string, duration: Duration, days: number, name: string, status: Rental['status']): Rental => {
    const w = window(kind, date, time, duration, days)!
    const total = priceFor(products[kind], duration, days)
    return { id: `seed-${n}`, ref: makeRef(n), unitId, kind, start: w[0], end: w[1], days, duration, name, phone: '6900000000', total, advance: advanceFor(total), status, createdAt: now.getTime() - n * 1000 }
  }
  return [
    mk(1, 'b2', 'boat', addDays(today, 1), '10:00', '4h', 1, 'Anna Schmidt', 'booked'),
    mk(2, 'b1', 'boat', addDays(today, 1), '10:00', '2h', 1, 'Νίκος Παπάς', 'booked'),
    mk(3, 'b1', 'boat', addDays(today, 1), '14:00', '4h', 1, 'Peter Hansen', 'booked'),
    mk(4, 's1', 'scooter', today, '10:00', 'days', 3, 'Μαρία Κ.', 'out'),
    mk(5, 's2', 'scooter', addDays(today, 1), '10:00', 'days', 2, 'Γιώργος Λ.', 'booked'),
    mk(6, 's3', 'scooter', addDays(today, 3), '12:00', 'days', 1, 'Eva Novak', 'booked'),
  ]
}

export const rentals = ref<Rental[]>(load<Rental[]>(KEYS.rentals, []))
if (!rentals.value.length) rentals.value = seed(new Date())
let seq = load<number>(KEYS.seq, rentals.value.length)
watch(rentals, (v) => save(KEYS.rentals, v), { deep: true })

export interface RequestInput { kind: Kind; date: string; time: string; duration: Duration; days: number; name: string; phone: string; license: boolean }

export function reserve(input: RequestInput): { rental?: Rental; errors: Errors; taken?: boolean } {
  const product = products[input.kind]
  const errors = validate({ name: input.name, phone: input.phone, license: input.license, needsLicense: product.needsLicense, days: input.days, kind: input.kind, time: input.time })
  if (Object.keys(errors).length) return { errors }
  const days = input.kind === 'scooter' ? input.days : 1
  const w = window(input.kind, input.date, input.time, input.duration, days)
  if (!w || w[0] < nowStamp(new Date()) + 60) return { errors: { slot: 'Η ώρα αυτή δεν είναι διαθέσιμη.' }, taken: true }
  // Re-check availability right before saving: another booking may have taken the last unit.
  const free = freeUnits(units, input.kind, rentals.value, w[0], w[1])
  if (!free.length) return { errors: { slot: 'Δεν υπάρχει πια διαθέσιμο όχημα για αυτή την ώρα. Επιλέξτε άλλη.' }, taken: true }
  seq += 1
  save(KEYS.seq, seq)
  const total = priceFor(product, input.duration, days)
  const r: Rental = {
    id: `r-${Date.now()}`, ref: makeRef(seq), unitId: free[0].id, kind: input.kind, start: w[0], end: w[1], days, duration: input.duration,
    name: input.name.trim(), phone: input.phone, total, advance: advanceFor(total), status: 'booked', createdAt: Date.now(),
  }
  rentals.value = [...rentals.value, r]
  return { rental: r, errors }
}
export const findRental = (ref: string): Rental | undefined => rentals.value.find((r) => r.ref === ref)
export const setStatus = (id: string, status: Rental['status']): void => {
  rentals.value = rentals.value.map((r) => (r.id === id ? { ...r, status } : r))
}
export function resetDemo(): void {
  rentals.value = seed(new Date())
  seq = rentals.value.length
  save(KEYS.seq, seq)
}
