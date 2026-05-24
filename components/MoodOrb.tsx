'use client'

import { useEffect, useRef } from 'react'

interface Props {
  score: number
}

function orbColor(score: number): string {
  if (score > 0.05) {
    const h = Math.round(140 - (score - 0.05) * 40)
    return `hsl(${h}, 75%, 50%)`
  }
  if (score < -0.05) return 'hsl(0, 75%, 50%)'
  return 'hsl(40, 15%, 55%)'
}

function toHsla(color: string, alpha: number): string {
  return color.replace('hsl(', 'hsla(').replace(')', `, ${alpha})`)
}

const PARTICLES = [
  { orbitExtra: 18, speed: 0.40, phase: 0 },
  { orbitExtra: 26, speed: 0.28, phase: Math.PI * 0.7 },
  { orbitExtra: 34, speed: 0.18, phase: Math.PI * 1.4 },
  { orbitExtra: 22, speed: 0.34, phase: Math.PI * 1.1 },
]

export default function MoodOrb({ score }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const cx = 100
    const cy = 100
    let t = 0

    const draw = () => {
      ctx.clearRect(0, 0, 200, 200)

      const intensity = 0.5 + Math.abs(score) * 0.5
      const speed = 0.03 * intensity
      t += speed

      const radius = 60 + Math.sin(t) * (10 + Math.abs(score) * 15)
      const color = orbColor(score)

      // Outer glow ring
      ctx.beginPath()
      ctx.arc(cx, cy, radius + 15, 0, Math.PI * 2)
      ctx.fillStyle = toHsla(color, 0.2)
      ctx.fill()

      // Main orb
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()

      // Orbiting particles
      for (const p of PARTICLES) {
        const angle = t * p.speed + p.phase
        const r = radius + p.orbitExtra
        const px = cx + Math.cos(angle) * r
        const py = cy + Math.sin(angle) * r
        ctx.beginPath()
        ctx.arc(px, py, 2, 0, Math.PI * 2)
        ctx.fillStyle = toHsla(color, 0.3)
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [score])

  return <canvas ref={canvasRef} width={200} height={200} style={{ background: 'transparent' }} />
}

export { orbColor }
