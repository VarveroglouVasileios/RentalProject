import { scrollState } from './scrollState'

/**
 * Page motion for the home view: smooth scroll, line reveals, a hero parallax and a route that is
 * drawn as you scroll. Everything is skipped for visitors who prefer reduced motion, and GSAP and
 * Lenis are only downloaded when they are needed. Returns a cleanup function.
 */
export async function startHomeMotion(): Promise<() => void> {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}
  const [{ gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
    import('lenis'),
  ])
  gsap.registerPlugin(ScrollTrigger)
  document.documentElement.classList.add('motion')

  const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 })
  lenis.on('scroll', ScrollTrigger.update)
  const tick = (time: number) => lenis.raf(time * 1000)
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)

  const ctx = gsap.context(() => {
    // Headline: each line rises out of its own mask.
    gsap.from('.split .in', { yPercent: 115, duration: 1.15, ease: 'expo.out', stagger: 0.12, delay: 0.15 })
    gsap.from('.hero-in .coord, .hero-in .lead', { y: 24, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.7, stagger: 0.12 })

    // Hero photo drifts slower than the page while the sea responds to the same progress.
    gsap.to('.hero > img', {
      yPercent: 14, scale: 1.12, ease: 'none',
      scrollTrigger: {
        trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true,
        onUpdate: (self) => { scrollState.hero = self.progress },
      },
    })

    // Section headings and table rows.
    gsap.utils.toArray<HTMLElement>('.sec h2').forEach((el) => {
      gsap.from(el, { y: 60, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } })
    })
    gsap.from('.row', { y: 40, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.12, scrollTrigger: { trigger: '#fleet', start: 'top 70%' } })

    // The ticker leans with the scroll speed.
    ScrollTrigger.create({
      onUpdate: (self) => {
        gsap.to('.ticker-track', { skewX: gsap.utils.clamp(-10, 10, self.getVelocity() / -250), duration: 0.5, ease: 'power3.out', overwrite: true })
      },
    })

    // The route is drawn by scrolling and the boat follows it; the bays light up as it passes them.
    const route = document.querySelector<SVGPathElement>('#route')
    const boat = document.querySelector<SVGGElement>('#boat')
    if (route && boat) {
      const length = route.getTotalLength()
      const start = route.getPointAtLength(0)
      route.style.strokeDasharray = String(length)
      route.style.strokeDashoffset = String(length)
      const stops = Array.from(document.querySelectorAll<SVGGElement>('.bayp')).map((node) => {
        const cx = Number(node.dataset.x)
        const cy = Number(node.dataset.y)
        let best = 0
        let bestD = Infinity
        for (let i = 0; i <= 200; i++) {
          const p = route.getPointAtLength((length * i) / 200)
          const d = (p.x - cx) ** 2 + (p.y - cy) ** 2
          if (d < bestD) { bestD = d; best = i / 200 }
        }
        return { node, at: best }
      })
      const rows = Array.from(document.querySelectorAll<HTMLElement>('.bay[data-bay]'))
      ScrollTrigger.create({
        trigger: '#bays', start: 'top 65%', end: 'bottom 55%', scrub: 0.6,
        onUpdate: (self) => {
          const p = self.progress
          route.style.strokeDashoffset = String(length * (1 - p))
          const pt = route.getPointAtLength(length * p)
          boat.setAttribute('transform', `translate(${pt.x - start.x} ${pt.y - start.y})`)
          stops.forEach((s, i) => {
            const hit = p >= s.at - 0.02
            s.node.classList.toggle('hit', hit)
            rows[i]?.classList.toggle('hit', hit)
          })
        },
      })
    }
  })

  const refresh = () => ScrollTrigger.refresh()
  window.addEventListener('load', refresh)
  return () => {
    window.removeEventListener('load', refresh)
    ctx.revert()
    gsap.ticker.remove(tick)
    lenis.destroy()
    document.documentElement.classList.remove('motion')
    scrollState.hero = 0
  }
}
