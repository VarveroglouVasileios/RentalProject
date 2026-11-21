import { reactive } from 'vue'

/** Scroll progress shared between the page motion and the Three.js sea (0 at the top, 1 after the hero). */
export const scrollState = reactive({ hero: 0 })
