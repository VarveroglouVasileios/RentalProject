<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { scrollState } from '@/lib/scrollState'

/**
 * A light Three.js sea surface drawn over the hero photo: one full-screen quad and a fragment
 * shader with layered wave lines. Three.js is loaded lazily, the loop pauses when the hero is
 * off screen, and with reduced motion only a single still frame is drawn. If WebGL is not
 * available nothing is shown and the photo stays as it is.
 */
const host = ref<HTMLDivElement | null>(null)
let stop: (() => void) | null = null

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`
const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform float uTime;
uniform vec2 uPointer;
uniform float uAspect;
uniform float uScroll;
float wave(vec2 p, float t){
  float w = sin(p.x * 2.2 + t * 0.9) * 0.5;
  w += sin(p.x * 4.1 - t * 1.3 + p.y * 3.0) * 0.25;
  w += sin(p.x * 8.3 + t * 1.9) * 0.08;
  return w;
}
void main(){
  vec2 p = vec2((vUv.x - 0.5) * uAspect + uPointer.x * 0.15, vUv.y);
  float acc = 0.0;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float y = 0.08 + fi * 0.062;
    float amp = 0.022 * (1.0 + uScroll * 2.2);
    float line = abs(p.y - y - uScroll * 0.12 - wave(p * (1.0 + fi * 0.12), uTime + fi * 1.7) * amp * (1.0 + fi * 0.35));
    float thickness = 0.0045 + fi * 0.0014;
    acc += smoothstep(thickness, 0.0, line) * (0.55 - fi * 0.05);
  }
  float fade = smoothstep(0.62, 0.05, vUv.y);
  vec3 col = mix(vec3(0.12, 0.71, 0.79), vec3(1.0), acc * 0.55);
  gl_FragColor = vec4(col, min(1.0, acc * fade * 1.25));
}`

onMounted(async () => {
  const el = host.value
  if (!el) return
  const test = document.createElement('canvas')
  if (!(test.getContext('webgl2') || test.getContext('webgl'))) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const THREE = await import('three')
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.setClearColor(0x000000, 0)
  el.appendChild(renderer.domElement)
  renderer.domElement.setAttribute('aria-hidden', 'true')
  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true,
    uniforms: { uTime: { value: 0 }, uPointer: { value: new THREE.Vector2() }, uAspect: { value: 1.6 }, uScroll: { value: 0 } },
  })
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material))

  const resize = () => {
    const w = el.clientWidth || 1
    const h = el.clientHeight || 1
    renderer.setSize(w, h, false)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    material.uniforms.uAspect.value = w / h
    renderer.render(scene, camera)
  }
  const ro = new ResizeObserver(resize)
  ro.observe(el)
  resize()

  let raf = 0
  let visible = true
  const t0 = performance.now()
  const tick = () => {
    material.uniforms.uTime.value = (performance.now() - t0) / 1000
    material.uniforms.uScroll.value = scrollState.hero
    renderer.render(scene, camera)
    raf = visible ? requestAnimationFrame(tick) : 0
  }
  const onMove = (e: PointerEvent) => {
    material.uniforms.uPointer.value.set((e.clientX / window.innerWidth) * 2 - 1, 0)
  }
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (visible && !raf && !reduced) raf = requestAnimationFrame(tick)
  })
  io.observe(el)
  if (!reduced) {
    window.addEventListener('pointermove', onMove, { passive: true })
    raf = requestAnimationFrame(tick)
  }
  stop = () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('pointermove', onMove)
    ro.disconnect()
    io.disconnect()
    renderer.dispose()
    material.dispose()
    renderer.domElement.remove()
  }
})
onBeforeUnmount(() => stop?.())
</script>

<template><div ref="host" class="sea" aria-hidden="true"></div></template>
