import type { Product, Unit } from '@/lib/rental'

// Prices and rules are illustrative.
export const products: Record<'boat' | 'scooter', Product> = {
  boat: {
    kind: 'boat', name: 'Σκάφος 5 ατόμων', image: 'motorboat', seats: 5, deposit: 100, needsLicense: false,
    blurb: 'Χωρίς δίπλωμα, με τέντα και σκάλα για κολύμπι. Σωσίβια για όλους και σύντομη εκπαίδευση πριν φύγετε.',
    prices: { '2h': 70, '4h': 120, day: 190 },
  },
  scooter: {
    kind: 'scooter', name: 'Scooter 125cc', image: 'scooter', seats: 2, deposit: 80, needsLicense: true,
    blurb: 'Δύο κράνη και μπαγκαζιέρα. Απαιτείται δίπλωμα μοτοσικλέτας ή αυτοκινήτου που ισχύει. Έκπτωση για 3+ ημέρες.',
    prices: { day: 25 },
  },
}

export const units: Unit[] = [
  { id: 'b1', kind: 'boat', name: 'Σκάφος 1' }, { id: 'b2', kind: 'boat', name: 'Σκάφος 2' },
  { id: 's1', kind: 'scooter', name: 'Scooter 1' }, { id: 's2', kind: 'scooter', name: 'Scooter 2' },
  { id: 's3', kind: 'scooter', name: 'Scooter 3' }, { id: 's4', kind: 'scooter', name: 'Scooter 4' },
]

export const bays = [
  ['A', 'Κόλπος Αγίου Ιωάννη', 20], ['B', 'Γαλάζια Σπηλιά', 35], ['C', 'Ακρωτήρι Βαθύ', 50],
] as const
