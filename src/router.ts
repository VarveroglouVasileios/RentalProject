import { createRouter, createWebHashHistory } from 'vue-router'

export const router = createRouter({
  // Hash history: deep links and reloads work on GitHub Pages without server fallbacks.
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('./views/HomeView.vue') },
    { path: '/book', name: 'book', component: () => import('./views/BookView.vue') },
    { path: '/rental/:ref', name: 'rental', component: () => import('./views/RentalView.vue') },
    { path: '/fleet', name: 'fleet', component: () => import('./views/FleetView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: (to) => (to.hash ? { el: to.hash, behavior: 'smooth' } : { top: 0 }),
})
