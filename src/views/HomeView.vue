<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { bays, products, units } from '@/data/fleet'
import { formatEuro, freeUnits, nowStamp, priceFor, stamp, toISO } from '@/lib/rental'
import SeaCanvas from '@/components/SeaCanvas.vue'
import { img } from '@/lib/storage'
import { rentals } from '@/lib/store'

const today = toISO(new Date())
const board = computed(() => {
  const now = new Date()
  const rows: { time: string; label: string; free: number }[] = []
  for (const [time, kind, label] of [['12:00', 'boat', 'Σκάφος · 2 ώρες'], ['14:00', 'boat', 'Σκάφος · 2 ώρες'], ['10:00', 'scooter', 'Scooter · ημέρα']] as const) {
    const w = kind === 'boat' ? [stamp(today, time), stamp(today, time) + 120] : [stamp(today, time), stamp(today, time) + 1440]
    const past = w[0] < nowStamp(now)
    rows.push({ time, label, free: past ? -1 : freeUnits(units, kind, rentals.value, w[0], w[1]).length })
  }
  return rows
})
const clock = new Date().toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })
const marquee = 'Σκάφη χωρίς δίπλωμα ✦ Scooter 125cc ✦ Σωσίβια δωρεάν ✦ Παραλαβή στο λιμάνι ✦ Ακύρωση έως 48 ώρες ✦ '.repeat(2)
const sb = (k: 'boat' | 'scooter') => products[k]
</script>

<template>
  <section class="hero" aria-labelledby="h">
    <img :src="img('motorboat')" alt="Μικρό σκάφος δεμένο σε ξύλινη αποβάθρα σε τιρκουάζ κόλπο" width="1024" height="1024" />
    <SeaCanvas />
    <div class="wrap hero-in">
      <div>
        <p class="coord mono">40°46′N · 24°42′E · ΛΙΜΑΝΙ ΘΑΣΟΥ</p>
        <h1 id="h">Βγείτε<br />στ' ανοιχτά.</h1>
        <p class="lead">Σκάφη χωρίς δίπλωμα και scooter. Κλείνετε σε ένα λεπτό, παραλαμβάνετε από το λιμάνι.</p>
      </div>
      <div class="board" aria-label="Αναχωρήσεις σήμερα">
        <div class="hd"><span>ΑΝΑΧΩΡΗΣΕΙΣ ΣΗΜΕΡΑ</span><span>{{ clock }}</span></div>
        <div v-for="r in board" :key="r.time + r.label" class="r">
          <b>{{ r.time }}</b><span>{{ r.label }}</span>
          <span v-if="r.free < 0" class="no">ΕΦΥΓΕ</span>
          <span v-else-if="r.free === 0" class="no">ΠΛΗΡΕΣ</span>
          <span v-else class="ok blink">{{ r.free }} ΕΛΕΥΘΕΡΑ</span>
        </div>
        <RouterLink class="btn" style="width: 100%; margin-top: 1rem; box-sizing: border-box" to="/book">Κλείστε θέση →</RouterLink>
      </div>
    </div>
  </section>

  <div class="ticker" aria-hidden="true"><div class="ticker-track"><span>{{ marquee }}</span><span>{{ marquee }}</span></div></div>

  <div class="wrap">
    <section id="fleet" class="sec" aria-labelledby="f">
      <div class="prices-head"><h2 id="f">Στόλος<br />και τιμές</h2><p class="hint" style="max-width: 22rem">Οι τιμές είναι ενδεικτικές [ΤΙΜΟΚΑΤΑΛΟΓΟΣ]. Σε οθόνες με ποντίκι, περάστε πάνω από μια γραμμή για φωτογραφία.</p></div>
      <div class="colhead" aria-hidden="true"><span>ΝΟ</span><span>ΟΧΗΜΑ</span><span>2 ΩΡΕΣ</span><span>4 ΩΡΕΣ</span><span>ΗΜΕΡΑ</span><span></span></div>
      <RouterLink :to="{ path: '/book', query: { kind: 'boat' } }" class="row">
        <img class="thumb" :src="img('motorboat')" alt="" /><span class="n">01</span>
        <div><div class="nm">{{ sb('boat').name }}</div><div class="sub">Χωρίς δίπλωμα · τέντα · σκάλα · εγγύηση {{ sb('boat').deposit }} €</div></div>
        <b class="p">{{ formatEuro(priceFor(sb('boat'), '2h')) }}</b><b class="p hide-sm">{{ formatEuro(priceFor(sb('boat'), '4h')) }}</b><b class="p hide-sm">{{ formatEuro(priceFor(sb('boat'), 'day')) }}</b>
        <span class="btn" style="min-height: 44px">Κράτηση</span>
      </RouterLink>
      <RouterLink :to="{ path: '/book', query: { kind: 'scooter' } }" class="row">
        <img class="thumb" :src="img('scooter')" alt="" /><span class="n">02</span>
        <div><div class="nm">{{ sb('scooter').name }}</div><div class="sub">2 κράνη · μπαγκαζιέρα · δίπλωμα · εγγύηση {{ sb('scooter').deposit }} €</div></div>
        <b class="p" style="color: var(--soft)">—</b><b class="p hide-sm" style="color: var(--soft)">—</b><b class="p hide-sm">{{ formatEuro(priceFor(sb('scooter'), 'days', 1)) }}</b>
        <span class="btn" style="min-height: 44px">Κράτηση</span>
      </RouterLink>
      <RouterLink :to="{ path: '/book', query: { kind: 'boat' } }" class="row" style="border-bottom: 2px solid rgba(255, 255, 255, .28)">
        <img class="thumb" :src="img('snorkel')" alt="" /><span class="n">03</span>
        <div><div class="nm">Εξοπλισμός snorkel</div><div class="sub">Μάσκα · αναπνευστήρας · πέδιλα, με το σκάφος</div></div>
        <b class="p">5 €</b><b class="p hide-sm">8 €</b><b class="p hide-sm">12 €</b>
        <span class="btn btn-line" style="min-height: 44px">Με σκάφος</span>
      </RouterLink>
    </section>

    <section id="bays" class="sec bays" aria-labelledby="b">
      <div>
        <h2 id="b">Τρεις κόλποι,<br />μία διαδρομή.</h2>
        <p class="hint" style="max-width: 26rem; margin: 1.5rem 0">Προτεινόμενη διαδρομή για τις 4 ώρες: ένα κολύμπι, μια στάση για snorkel και επιστροφή πριν το σούρουπο.</p>
        <div class="bay" v-for="b in bays" :key="b[0]"><span>{{ b[0] }} · {{ b[1] }}</span><b>{{ b[2] }}΄</b></div>
        <div class="bay" style="border-bottom: 1px solid var(--line)"><span>Επιστροφή στο λιμάνι</span><b>—</b></div>
      </div>
      <div class="map">
        <svg viewBox="0 0 560 420" style="width: 100%; display: block" role="img" aria-label="Χάρτης διαδρομής με τρεις στάσεις">
          <path d="M0 0H560V420H0Z" fill="#0f3160" />
          <path d="M0 300C90 270 160 340 260 320C360 300 430 360 560 330V420H0Z" fill="#14407e" opacity=".55" />
          <path d="M120 20C220 0 300 60 350 40C420 20 500 70 540 140L560 0H120Z" fill="#e9dfc8" opacity=".9" />
          <path class="route" d="M70 250C130 200 150 130 230 150C310 170 300 250 380 230C440 215 470 140 500 110" fill="none" stroke="#ff8a6b" stroke-width="4" stroke-linecap="round" />
          <g font-family="Roboto Mono Variable,monospace" font-weight="700" font-size="15" fill="#f6f1e7">
            <circle cx="70" cy="250" r="8" fill="#f6f1e7" /><text x="86" y="276">ΛΙΜΑΝΙ</text>
            <circle cx="230" cy="150" r="8" fill="#e8553a" /><text x="244" y="140">A</text>
            <circle cx="380" cy="230" r="8" fill="#e8553a" /><text x="394" y="258">B</text>
            <circle cx="500" cy="110" r="8" fill="#e8553a" /><text x="468" y="98">C</text>
          </g>
          <g class="bob"><path d="M52 246h36l-8 12H60z" fill="#f6f1e7" /><path d="M70 220v26" stroke="#f6f1e7" stroke-width="3" /><path d="M70 222l16 18H70z" fill="#e8553a" /></g>
        </svg>
      </div>
    </section>

    <section id="safety" class="sec" aria-labelledby="s">
      <div class="safe">
        <img :src="img('snorkel')" alt="Μάσκα, βατραχοπέδιλα και σωσίβιο σε κατάστρωμα" loading="lazy" />
        <div class="safe-in"><h2 id="s">Ασφάλεια<br />πρώτα.</h2><ul><li>✓ Σωσίβια για όλους, δωρεάν</li><li>✓ 10΄ εκπαίδευση πριν φύγετε</li><li>✓ Χάρτης ασφαλών κόλπων</li><li>✓ Επείγουσα γραμμή [ΤΗΛΕΦΩΝΟ]</li></ul></div>
      </div>
    </section>
  </div>
</template>
