<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { products, units } from '@/data/fleet'
import {
  addDays, advanceFor, formatEuro, freeUnits, MAX_DAYS, parseISO, priceFor, startOptions, toISO, window as win,
  type Duration, type Errors, type Kind,
} from '@/lib/rental'
import { img } from '@/lib/storage'
import { rentals, reserve } from '@/lib/store'

const route = useRoute()
const router = useRouter()
const kind = ref<Kind>(route.query.kind === 'scooter' ? 'scooter' : 'boat')
const duration = ref<Duration>('4h')
const days = ref(1)
const now = ref(new Date())
const date = ref(toISO(now.value))
const time = ref('')
const form = reactive({ name: '', phone: '', license: false })
const errors = ref<Errors>({})

const product = computed(() => products[kind.value])
const effDuration = computed<Duration>(() => (kind.value === 'scooter' ? 'days' : duration.value))
const effDays = computed(() => (kind.value === 'scooter' ? days.value : 1))
const dates = computed(() => Array.from({ length: 14 }, (_, i) => addDays(toISO(now.value), i)))
const options = computed(() => startOptions({ units, kind: kind.value, date: date.value, duration: effDuration.value, days: effDays.value, rentals: rentals.value, now: now.value }))
const total = computed(() => priceFor(product.value, effDuration.value, effDays.value))
const advance = computed(() => advanceFor(total.value))
const durLabels: [Duration, string][] = [['2h', '2 ώρες'], ['4h', '4 ώρες (μισή ημέρα)'], ['day', 'Ολόκληρη ημέρα']]
const label = (iso: string) => { const d = parseISO(iso); return { w: d.toLocaleDateString('el-GR', { weekday: 'short' }), n: d.getDate() } }
const endsAt = computed(() => {
  const w = win(kind.value, date.value, time.value || '09:00', effDuration.value, effDays.value)
  return w && time.value ? new Date(w[1] * 60000).toLocaleString('el-GR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) : ''
})

watch([kind, duration, days, date], () => { if (!options.value.some((o) => o.time === time.value && o.free > 0)) time.value = '' })

function submit() {
  now.value = new Date()
  const res = reserve({ kind: kind.value, date: date.value, time: time.value, duration: effDuration.value, days: effDays.value, name: form.name, phone: form.phone, license: form.license })
  errors.value = res.errors
  if (res.taken) time.value = ''
  if (res.rental) router.push({ name: 'rental', params: { ref: res.rental.ref } })
}
const freeNow = computed(() => {
  const w = win(kind.value, date.value, time.value || '09:00', effDuration.value, effDays.value)
  return w ? freeUnits(units, kind.value, rentals.value, w[0], w[1]).length : 0
})
</script>

<template>
  <div class="wrap">
    <h1 class="page-h">Κλείστε το όχημά σας</h1>
    <form class="bk" novalidate @submit.prevent="submit">
      <div>
        <section class="step" aria-labelledby="s1">
          <h2 id="s1">1. Όχημα</h2>
          <div class="cards" role="radiogroup" aria-labelledby="s1">
            <button v-for="k in (['boat', 'scooter'] as Kind[])" :key="k" type="button" role="radio" class="vc" :aria-checked="kind === k" @click="kind = k">
              <img :src="img(products[k].image)" alt="" /><span>{{ products[k].name }}<small>{{ k === 'boat' ? 'από ' + formatEuro(priceFor(products.boat, '2h')) + ' / 2 ώρες' : formatEuro(priceFor(products.scooter, 'days', 1)) + ' / ημέρα' }}</small></span>
            </button>
          </div>
          <p class="hint">{{ product.blurb }}</p>
        </section>

        <section class="step" aria-labelledby="s2">
          <h2 id="s2">2. Διάρκεια</h2>
          <div v-if="kind === 'boat'" class="pills" role="radiogroup" aria-labelledby="s2">
            <button v-for="[d, l] in durLabels" :key="d" type="button" role="radio" class="pill" :aria-checked="duration === d" @click="duration = d">{{ l }}</button>
          </div>
          <div v-else class="stepper">
            <button type="button" aria-label="Λιγότερες ημέρες" :disabled="days <= 1" @click="days -= 1">−</button>
            <b aria-live="polite">{{ days }} {{ days === 1 ? 'ημέρα' : 'ημέρες' }}</b>
            <button type="button" aria-label="Περισσότερες ημέρες" :disabled="days >= MAX_DAYS" @click="days += 1">+</button>
          </div>
          <p v-if="kind === 'scooter'" class="hint">Έκπτωση 10% από 3 ημέρες και 20% από 7 ημέρες.</p>
          <p v-if="errors.days" class="err" role="alert">{{ errors.days }}</p>
        </section>

        <section class="step" aria-labelledby="s3">
          <h2 id="s3">3. Ημερομηνία και ώρα παραλαβής</h2>
          <div class="pills" role="group" aria-label="Ημερομηνία" style="margin-bottom: 1rem">
            <button v-for="d in dates" :key="d" type="button" class="pill" :aria-pressed="date === d" @click="date = d">{{ label(d).w }} {{ label(d).n }}</button>
          </div>
          <div class="pills" role="group" aria-label="Ώρα παραλαβής">
            <button v-for="o in options" :key="o.time" type="button" class="pill" :disabled="o.free === 0" :aria-pressed="time === o.time" @click="time = o.time">
              {{ o.time }} <small class="mono" style="opacity: .75">{{ o.free ? `· ${o.free}` : '· πλήρες' }}</small>
            </button>
          </div>
          <p v-if="!options.length" class="err">Δεν υπάρχουν ώρες αυτή την ημέρα. Δοκιμάστε άλλη.</p>
          <p v-if="errors.slot" class="err" role="alert">{{ errors.slot }}</p>
          <p class="hint">Ο αριθμός δείχνει πόσα οχήματα είναι ελεύθερα. Τα σκάφη επιστρέφουν έως τις 20:00 και χρειάζονται 30΄ καθαρισμό μεταξύ ενοικιάσεων.</p>
        </section>

        <section class="step" aria-labelledby="s4">
          <h2 id="s4">4. Στοιχεία</h2>
          <div class="f-row">
            <div class="f"><label for="n">Ονοματεπώνυμο</label><input id="n" v-model="form.name" type="text" autocomplete="name" :aria-invalid="!!errors.name" /><p v-if="errors.name" class="err" role="alert">{{ errors.name }}</p></div>
            <div class="f"><label for="p">Κινητό</label><input id="p" v-model="form.phone" type="tel" autocomplete="tel" :aria-invalid="!!errors.phone" /><p v-if="errors.phone" class="err" role="alert">{{ errors.phone }}</p></div>
          </div>
          <label v-if="product.needsLicense" class="chk"><input v-model="form.license" type="checkbox" /> Έχω δίπλωμα που ισχύει και θα το έχω μαζί μου</label>
          <p v-if="errors.license" class="err" role="alert">{{ errors.license }}</p>
        </section>
      </div>

      <aside class="sum" aria-label="Η κράτησή σας">
        <h2>Η κράτησή σας</h2>
        <p style="margin: 0; font-size: 1.2rem; font-weight: 700">{{ product.name }}</p>
        <p class="hint" style="margin: .3rem 0 1rem">{{ time ? `Παραλαβή ${time} · επιστροφή ${endsAt}` : 'Επιλέξτε ώρα παραλαβής' }}</p>
        <div class="ln"><span>Ενοικίαση</span><b class="mono">{{ formatEuro(total) }}</b></div>
        <div class="ln"><span>Εγγύηση (επιστρέφεται)</span><b class="mono">{{ formatEuro(product.deposit * 100) }}</b></div>
        <div class="adv"><span>Προκαταβολή τώρα</span><b>{{ formatEuro(advance) }}</b></div>
        <p v-if="time" class="hint">Διαθέσιμα οχήματα: {{ freeNow }}</p>
        <button class="btn" :disabled="!time">Επιβεβαίωση κράτησης</button>
        <p class="hint" style="text-align: center">Το υπόλοιπο πληρώνεται στην παραλαβή. Δωρεάν ακύρωση έως 48 ώρες πριν.</p>
      </aside>
    </form>
  </div>
</template>
