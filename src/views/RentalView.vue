<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { products, units } from '@/data/fleet'
import { formatEuro } from '@/lib/rental'
import { findRental, setStatus } from '@/lib/store'

const route = useRoute()
const r = computed(() => findRental(String(route.params.ref)))
const unitName = computed(() => units.find((u) => u.id === r.value?.unitId)?.name ?? '')
const fmt = (s: number) => new Date(s * 60000).toLocaleString('el-GR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: false })
</script>

<template>
  <div class="wrap">
    <div v-if="!r" style="padding-block: 3rem"><p>Η κράτηση δεν βρέθηκε σε αυτόν τον browser.</p><RouterLink class="btn" to="/">Αρχική</RouterLink></div>
    <article v-else class="receipt" aria-labelledby="t">
      <h1 id="t">{{ r.status === 'cancelled' ? 'Η κράτηση ακυρώθηκε' : 'Είστε στη λίστα.' }}</h1>
      <p class="ref">{{ r.ref }}</p>
      <p><b>{{ products[r.kind].name }}</b> · {{ unitName }}</p>
      <p>Παραλαβή: {{ fmt(r.start) }}<br />Επιστροφή: {{ fmt(r.end) }}</p>
      <p>Σύνολο {{ formatEuro(r.total) }} · προκαταβολή {{ formatEuro(r.advance) }} · εγγύηση {{ formatEuro(products[r.kind].deposit * 100) }}</p>
      <p class="hint">Φέρτε ταυτότητα{{ products[r.kind].needsLicense ? ' και δίπλωμα' : '' }}. Ενδεικτικό demo: δεν έγινε πραγματική κράτηση.</p>
      <p style="display: flex; gap: .8rem; flex-wrap: wrap; margin-top: 1.4rem">
        <button v-if="r.status === 'booked'" class="btn btn-line" @click="setStatus(r.id, 'cancelled')">Ακύρωση κράτησης</button>
        <RouterLink class="btn" to="/book">Νέα κράτηση</RouterLink>
      </p>
    </article>
  </div>
</template>
