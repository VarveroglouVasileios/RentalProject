/** Pure rental logic: per-unit availability, duration pricing, deposit and licence rules. Money in cents. */

export type Kind = 'boat' | 'scooter'
export type Duration = '2h' | '4h' | 'day' | 'days'

export interface Unit {
  id: string
  kind: Kind
  name: string
}
export interface Product {
  kind: Kind
  name: string
  blurb: string
  image: string
  /** Euros. Boats are priced per block, scooters per day. */
  prices: Partial<Record<Duration, number>>
  deposit: number
  needsLicense: boolean
  seats: number
}
export interface Rental {
  id: string
  ref: string
  unitId: string
  kind: Kind
  /** Epoch minutes (local time), half-open [start, end). */
  start: number
  end: number
  days: number
  duration: Duration
  name: string
  phone: string
  total: number // cents
  advance: number // cents paid now
  status: 'booked' | 'out' | 'returned' | 'cancelled'
  createdAt: number
}

export const OPEN_MIN = 9 * 60 // 09:00
export const CLOSE_MIN = 20 * 60 // boats back by 20:00
export const TURNAROUND = 30 // minutes to clean/refuel a boat between rentals
export const ADVANCE_RATE = 0.3
export const MAX_DAYS = 14
export const BOAT_BLOCKS: Record<Exclude<Duration, 'days'>, number> = { '2h': 120, '4h': 240, day: 11 * 60 }

export const cents = (euros: number): number => Math.round(euros * 100)
export const formatEuro = (c: number): string => `${(c / 100).toFixed(2).replace('.', ',')} €`
export const pad = (n: number): string => String(n).padStart(2, '0')
export const toISO = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parseISO = (s: string): Date => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const addDays = (iso: string, n: number): string => { const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d) }
export const toMin = (t: string): number => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
export const fromMin = (m: number): string => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
/** Minutes since a fixed epoch for a local date and clock time, so intervals compare as plain numbers. */
export const stamp = (iso: string, hhmm: string): number => Math.round(parseISO(iso).getTime() / 60000) + toMin(hhmm)
export const stampDate = (s: number): string => toISO(new Date(s * 60000))
export const stampTime = (s: number): string => {
  const d = new Date(s * 60000)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export const nowStamp = (now: Date): number => Math.round(now.getTime() / 60000)

export const overlaps = (aS: number, aE: number, bS: number, bE: number): boolean => aS < bE && bS < aE

/** Scooter discount: 10% from 3 days, 20% from 7 days. */
export const scooterDiscount = (days: number): number => (days >= 7 ? 0.2 : days >= 3 ? 0.1 : 0)

export function priceFor(p: Product, duration: Duration, days = 1): number {
  if (p.kind === 'boat') {
    const base = p.prices[duration === 'days' ? 'day' : duration]
    return base === undefined ? 0 : cents(base)
  }
  const day = p.prices.day ?? 0
  const n = Math.max(1, days)
  return Math.round(cents(day) * n * (1 - scooterDiscount(n)))
}

export const advanceFor = (total: number): number => Math.round(total * ADVANCE_RATE)

/** [start, end) for a booking request, or null when it does not fit the opening hours. */
export function window(kind: Kind, date: string, startTime: string, duration: Duration, days: number): [number, number] | null {
  const s = stamp(date, startTime)
  if (kind === 'boat') {
    const len = BOAT_BLOCKS[duration === 'days' ? 'day' : duration]
    const e = s + len
    if (toMin(startTime) < OPEN_MIN || toMin(startTime) + len > CLOSE_MIN) return null
    return [s, e]
  }
  if (toMin(startTime) < OPEN_MIN || toMin(startTime) > CLOSE_MIN - 60) return null
  return [s, s + days * 24 * 60]
}

export function unitIsFree(unit: Unit, rentals: Rental[], start: number, end: number): boolean {
  const pad = unit.kind === 'boat' ? TURNAROUND : 0
  return !rentals.some((r) => r.unitId === unit.id && r.status !== 'cancelled' && r.status !== 'returned' && overlaps(start, end, r.start, r.end + pad))
}

export function freeUnits(units: Unit[], kind: Kind, rentals: Rental[], start: number, end: number): Unit[] {
  return units.filter((u) => u.kind === kind && unitIsFree(u, rentals, start, end))
}

export interface StartOption { time: string; free: number }

export function startOptions(opts: { units: Unit[]; kind: Kind; date: string; duration: Duration; days: number; rentals: Rental[]; now: Date }): StartOption[] {
  const out: StartOption[] = []
  const nowS = nowStamp(opts.now)
  for (let m = OPEN_MIN; m <= CLOSE_MIN - 60; m += 30) {
    const time = fromMin(m)
    const w = window(opts.kind, opts.date, time, opts.duration, opts.days)
    if (!w) continue
    if (w[0] < nowS + 60) continue // an hour of notice
    const free = freeUnits(opts.units, opts.kind, opts.rentals, w[0], w[1]).length
    out.push({ time, free })
  }
  return out
}

export type Errors = Partial<Record<'name' | 'phone' | 'license' | 'slot' | 'days', string>>
export const normalizePhone = (raw: string): string => raw.replace(/[\s\-().]/g, '').replace(/^(\+30|0030)/, '')

export function validate(input: { name: string; phone: string; license: boolean; needsLicense: boolean; days: number; kind: Kind; time: string }): Errors {
  const e: Errors = {}
  if (input.name.trim().split(/\s+/).filter(Boolean).length < 2) e.name = 'Συμπληρώστε όνομα και επώνυμο.'
  if (!/^(\+?\d{7,15})$/.test(input.phone.replace(/[\s\-().]/g, ''))) e.phone = 'Συμπληρώστε έγκυρο τηλέφωνο επικοινωνίας.'
  if (input.needsLicense && !input.license) e.license = 'Για το scooter απαιτείται δίπλωμα που ισχύει.'
  if (input.kind === 'scooter' && (input.days < 1 || input.days > MAX_DAYS)) e.days = `Διάρκεια από 1 έως ${MAX_DAYS} ημέρες.`
  if (!input.time) e.slot = 'Επιλέξτε ώρα παραλαβής.'
  return e
}

export const makeRef = (n: number): string => `BW-${String(n).padStart(4, '0')}`
