<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router'

const route = useRoute()
const focusMain = () => document.getElementById('main')?.focus()
</script>

<template>
  <a class="skip" href="#main" @click.prevent="focusMain">Μετάβαση στο περιεχόμενο</a>
  <header class="bar" :class="{ solid: route.name !== 'home' }">
    <RouterLink to="/" class="logo">Blue<span>wake</span></RouterLink>
    <nav aria-label="Κύρια πλοήγηση">
      <RouterLink to="/#fleet" class="hide-sm">Τιμές</RouterLink>
      <RouterLink to="/#bays" class="hide-sm">Κόλποι</RouterLink>
      <RouterLink to="/fleet" class="hide-sm">Διαχείριση</RouterLink>
      <span class="tag">DEMO CONCEPT</span>
      <RouterLink to="/book" class="cta-sm">Κράτηση</RouterLink>
    </nav>
  </header>
  <main id="main" tabindex="-1"><RouterView /></main>
  <footer class="foot">
    <p class="foot-logo" aria-hidden="true">Bluewake</p>
    <p>Φανταστική επιχείρηση · Οι κρατήσεις δεν είναι πραγματικές<br />Σχεδιασμός και υλοποίηση: Βασίλειος Βαρβέρογλου · Οι φωτογραφίες είναι δημιουργημένες με AI και ενδεικτικές.</p>
    <p><RouterLink to="/privacy" class="foot-link">Απόρρητο και cookies</RouterLink></p>
  </footer>
</template>
