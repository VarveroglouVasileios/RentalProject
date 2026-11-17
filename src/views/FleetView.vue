<script setup lang="ts">
import { computed, ref } from 'vue'
import { products, units } from '@/data/fleet'
import { formatEuro, nowStamp, overlaps } from '@/lib/rental'
import { rentals, resetDemo, setStatus } from '@/lib/store'

const authed = ref(false)
const pw = ref('')
const wrong = ref(false)
const login = () => { authed.value = pw.value === 'demo'; wrong.value = !authed.value }
const labels = { booked: 'Κρατημένο', out: 'Έξω', returned: 'Επιστράφηκε', cancelled: 'Ακυρώθηκε' } as const
const fmt = (s: number) => new Date(s * 60000).toLocaleString('el-GR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
const state = computed(() => {
  const n = nowStamp(new Date())
  return units.map((u) => ({ u, busy: rentals.value.some((r) => r.unitId === u.id && (r.status === 'out' || (r.status === 'booked' && overlaps(n, n + 1, r.start, r.end)))) }))
})
const list = computed(() => [...rentals.value].sort((a, b) => a.start - b.start))
const unitName = (id: string) => units.find((u) => u.id === id)?.name ?? id
const reset = () => { if (confirm('Να επανέλθουν οι αρχικές δοκιμαστικές κρατήσεις;')) resetDemo() }
</script>

<template>
  <div class="wrap">
    <h1 class="page-h">Στόλος και κρατήσεις</h1>
    <form v-if="!authed" style="max-width: 24rem; padding-block: 1.5rem 4rem" @submit.prevent="login">
      <div class="f"><label for="pw">Κωδικός πρόσβασης</label><input id="pw" v-model="pw" type="text" autocomplete="off" /><p class="hint">Κωδικός demo: demo</p><p v-if="wrong" class="err" role="alert">Ο κωδικός δεν είναι σωστός.</p></div>
      <button class="btn">Είσοδος</button>
    </form>
    <div v-else style="padding-block: 1.5rem 5rem">
      <div class="fleet-grid">
        <div v-for="s in state" :key="s.u.id" class="u"><b>{{ s.u.name }}</b><span class="hint">{{ products[s.u.kind].seats }} θέσεις</span><br /><span class="st" :class="s.busy ? 'busy' : 'free'">{{ s.busy ? 'Σε χρήση' : 'Διαθέσιμο' }}</span></div>
      </div>
      <div class="tbl">
        <table class="t">
          <thead><tr><th>Πελάτης</th><th>Όχημα</th><th>Παραλαβή</th><th>Επιστροφή</th><th>Προκαταβολή</th><th>Κατάσταση</th><th>Ενέργειες</th></tr></thead>
          <tbody>
            <tr v-for="r in list" :key="r.id">
              <td><b>{{ r.name }}</b><br /><small class="hint">{{ r.ref }}</small></td><td>{{ unitName(r.unitId) }}</td><td>{{ fmt(r.start) }}</td><td>{{ fmt(r.end) }}</td>
              <td class="mono">{{ formatEuro(r.advance) }}</td><td><span class="pillst" :class="r.status">{{ labels[r.status] }}</span></td>
              <td>
                <button v-if="r.status === 'booked'" class="mini" @click="setStatus(r.id, 'out')">Παράδοση</button>
                <button v-if="r.status === 'out'" class="mini" @click="setStatus(r.id, 'returned')">Επιστροφή</button>
                <button v-if="r.status === 'booked'" class="mini alt" @click="setStatus(r.id, 'cancelled')">Ακύρωση</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="hint">Οι ώρες και τα ονόματα είναι πλασματικά. Ένα όχημα δεν μπορεί να κρατηθεί δύο φορές για την ίδια ώρα.</p>
      <p><button class="btn btn-line" @click="reset">Επαναφορά demo</button> <button class="btn btn-line" @click="authed = false">Έξοδος</button></p>
    </div>
  </div>
</template>
