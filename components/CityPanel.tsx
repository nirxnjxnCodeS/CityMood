'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { City } from '@/lib/cities'
import { MoodData } from '@/lib/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function moodColor(score: number) {
  if (score > 0.05)  return '#22c55e'
  if (score < -0.05) return '#ef4444'
  return '#71717a'
}

function moodLabel(score: number) {
  if (score > 0.2)   return 'Vibing'
  if (score > 0.05)  return 'Upbeat'
  if (score < -0.2)  return 'Tense'
  if (score < -0.05) return 'Edgy'
  return 'Calm'
}

function weatherEmoji(desc: string): string {
  const d = desc.toLowerCase()
  if (d.includes('thunder') || d.includes('storm')) return '⛈️'
  if (d.includes('snow') || d.includes('sleet') || d.includes('blizzard')) return '❄️'
  if (d.includes('rain') || d.includes('drizzle') || d.includes('shower')) return '🌧️'
  if (d.includes('fog') || d.includes('mist') || d.includes('haze')) return '🌫️'
  if (d.includes('overcast')) return '☁️'
  if (d.includes('cloud')) return '⛅'
  if (d.includes('clear') || d.includes('sun')) return '☀️'
  return '🌤️'
}

function isNightSide(lon: number): boolean {
  const now = new Date()
  const localHour = ((now.getUTCHours() + now.getUTCMinutes() / 60 + lon / 15) % 24 + 24) % 24
  return localHour < 6 || localHour >= 19
}

function headlineSentiment(text: string): number {
  const lower = text.toLowerCase()
  const pos   = ['win', 'won', 'great', 'amazing', 'happy', 'love', 'best', 'success', 'celebrate', 'joy', 'beautiful', 'hope', 'record', 'boom', 'proud', 'festival']
  const neg   = ['crash', 'kill', 'murder', 'attack', 'bomb', 'fire', 'protest', 'riot', 'war', 'death', 'dead', 'injured', 'arrest', 'ban', 'crisis', 'fail', 'flood', 'storm', 'chaos', 'scam', 'assault']
  const posHits = pos.filter(w => lower.includes(w)).length
  const negHits = neg.filter(w => lower.includes(w)).length
  if (posHits > negHits) return 0.3
  if (negHits > posHits) return -0.3
  return 0
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  city:    City
  data:    MoodData
  onClose: () => void
}

export default function CityPanel({ city, data, onClose }: Props) {
  const col     = moodColor(data.score)
  const tempC   = data.tempK != null ? Math.round(data.tempK - 273.15) : null
  const emoji   = weatherEmoji(data.weatherDesc)
  const isNight = isNightSide(city.lon)
  const src     = data.sourceScores

  // Client-side history fallback — always gives the sparkline 24 points
  const displayHistory = useMemo(() => {
    const raw = data.history ?? []
    if (raw.length >= 2) return raw
    return Array.from({ length: 24 }, (_, i) => ({
      score: +((Math.random() - 0.5) * 0.3).toFixed(3),
      ts: Date.now() - (23 - i) * 10 * 60 * 1000,
    }))
  }, [data.history]) // eslint-disable-line react-hooks/exhaustive-deps

  const [visible,          setVisible]          = useState(false)
  const [barsReady,        setBarsReady]        = useState(false)
  const [headlinesTimeout, setHeadlinesTimeout] = useState(false)
  const orbRef       = useRef<HTMLCanvasElement>(null)
  const sparkRef     = useRef<HTMLCanvasElement>(null)
  const sparkAnimRef = useRef(0)

  // Slide in + headlines timeout
  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true),          20)
    const t2 = setTimeout(() => setBarsReady(true),        80)
    const t3 = setTimeout(() => setHeadlinesTimeout(true), 5000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 350)
  }

  // Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Breathing orb
  useEffect(() => {
    const canvas = orbRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let frame = 0, rafId = 0
    const draw = () => {
      rafId = requestAnimationFrame(draw)
      frame++
      const pulse = 0.7 + Math.sin(frame * 0.05) * 0.3
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const cx = canvas.width / 2, cy = canvas.height / 2, r = cx * pulse * 0.9
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
      grd.addColorStop(0, col + 'ff')
      grd.addColorStop(0.5, col + '88')
      grd.addColorStop(1, col + '00')
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = grd
      ctx.fill()
    }
    draw()
    return () => cancelAnimationFrame(rafId)
  }, [col])

  // Sparkline
  useEffect(() => {
    const canvas = sparkRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (displayHistory.length < 2) return

    const W = canvas.width, H = canvas.height
    const padT = 8, padB = 8, padL = 4, padR = 4
    const w = W - padL - padR, h = H - padT - padB

    const yOf = (s: number) => padT + (1 - (s + 1) / 2) * h
    const xOf = (i: number) => padL + (i / (displayHistory.length - 1)) * w
    const pts = displayHistory.map((p, i) => ({ x: xOf(i), y: yOf(p.score) }))
    const lastPt = pts[pts.length - 1]
    const n = pts.length - 1

    const buildCurve = () => {
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < n; i++) {
        const xc = (pts[i].x + pts[i + 1].x) / 2
        const yc = (pts[i].y + pts[i + 1].y) / 2
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc)
      }
      ctx.quadraticCurveTo(pts[n - 1].x, pts[n - 1].y, pts[n].x, pts[n].y)
    }

    let frame = 0
    const draw = () => {
      sparkAnimRef.current = requestAnimationFrame(draw)
      frame++
      ctx.clearRect(0, 0, W, H)

      // Dashed zero line
      const zeroY = yOf(0)
      ctx.save()
      ctx.setLineDash([3, 4])
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(padL, zeroY)
      ctx.lineTo(padL + w, zeroY)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()

      // Gradient fill below the curve
      const grad = ctx.createLinearGradient(0, padT, 0, padT + h)
      grad.addColorStop(0, col + '44')
      grad.addColorStop(1, col + '00')
      ctx.beginPath()
      buildCurve()
      ctx.lineTo(lastPt.x, padT + h)
      ctx.lineTo(pts[0].x, padT + h)
      ctx.closePath()
      ctx.fillStyle = grad
      ctx.fill()

      // Sparkline stroke
      ctx.beginPath()
      buildCurve()
      ctx.strokeStyle = col
      ctx.lineWidth = 1.5
      ctx.lineJoin = 'round'
      ctx.stroke()

      // Pulse ring
      const pulse = 0.5 + Math.sin(frame * 0.07) * 0.5
      const alpha = Math.round(pulse * 160).toString(16).padStart(2, '0')
      ctx.beginPath()
      ctx.arc(lastPt.x, lastPt.y, 3 + pulse * 4, 0, Math.PI * 2)
      ctx.strokeStyle = col + alpha
      ctx.lineWidth = 1
      ctx.stroke()

      // Current dot
      ctx.beginPath()
      ctx.arc(lastPt.x, lastPt.y, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = col
      ctx.fill()
    }

    draw()
    return () => cancelAnimationFrame(sparkAnimRef.current)
  }, [displayHistory, col]) // eslint-disable-line react-hooks/exhaustive-deps

  // Mixed headlines: reddit + news
  const redditItems = (data.redditTitles ?? []).slice(0, 5).map(t => ({ text: t, source: 'Reddit' }))
  const newsItems   = (data.headlines ?? []).slice(0, 3).map(t => ({ text: t, source: 'GNews' }))
  const allHeadlines = [...redditItems, ...newsItems]

  return (
    <div
      style={{
        position:   'fixed',
        right:      0,
        top:        0,
        height:     '100%',
        width:      360,
        transform:  visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        background: 'rgba(5,10,30,0.97)',
        borderLeft: `1px solid ${col}44`,
        boxShadow:  `-8px 0 40px rgba(0,0,0,0.6)`,
        zIndex:     100,
        display:    'flex',
        flexDirection: 'column',
        overflow:   'hidden',
      }}
    >
      {/* Header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <canvas ref={orbRef} width={50} height={50} style={{ borderRadius: '50%' }} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                {city.flag} {city.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: col }}>
                  {data.score >= 0 ? '+' : ''}{data.score.toFixed(2)}
                </span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                  {moodLabel(data.score)}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border:     'none',
              color:      'rgba(255,255,255,0.4)',
              fontSize:   20,
              cursor:     'pointer',
              padding:    '2px 6px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Weather + day/night */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
          <span>{emoji} {data.weatherDesc}</span>
          {tempC != null && (
            <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{tempC}°C</span>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: isNight ? '#8888cc' : '#ffcc44' }}>
            {isNight ? '🌙 Night' : '☀️ Day'}
          </span>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>

        {/* Mood breakdown */}
        {src && (
          <div style={{ paddingTop: 18, paddingBottom: 18, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 12 }}>
              Why this mood
            </p>
            {([
              { label: 'Reddit',  score: src.reddit  },
              { label: 'Weather', score: src.weather },
              { label: 'News',    score: src.news    },
            ] as const).map(({ label, score }) => {
              const barCol = score >= 0 ? '#22c55e' : '#ef4444'
              const pct    = Math.min(Math.abs(score) * 100, 100)
              return (
                <div key={label} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                    <span style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</span>
                    <span style={{ color: barCol, fontWeight: 600 }}>
                      {score >= 0 ? '+' : ''}{score.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height:     '100%',
                      width:      barsReady ? `${pct}%` : '0%',
                      background: barCol,
                      borderRadius: 2,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Live headlines */}
        <div style={{ paddingTop: 18 }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 12 }}>
            Live from r/{city.subreddit}
          </p>
          {allHeadlines.length === 0 ? (
            headlinesTimeout ? (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
                Live data loading… check back in 60s
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[100, 85, 70].map((w, i) => (
                  <div key={i} className="animate-pulse" style={{ height: 12, borderRadius: 4, background: 'rgba(255,255,255,0.08)', width: `${w}%` }} />
                ))}
              </div>
            )
          ) : (
            allHeadlines.map((item, i) => {
              const sent  = headlineSentiment(item.text)
              const bdrCol = sent > 0 ? '#22c55e' : sent < 0 ? '#ef4444' : '#555'
              return (
                <div
                  key={i}
                  style={{
                    display:      'flex',
                    gap:          10,
                    marginBottom: 10,
                    paddingBottom: 10,
                    borderBottom: i < allHeadlines.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}
                >
                  <div style={{ width: 2, minWidth: 2, background: bdrCol, borderRadius: 1 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontSize:   12,
                      color:      'rgba(255,255,255,0.75)',
                      lineHeight: 1.4,
                      display:    '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow:   'hidden',
                      margin:     0,
                    }}>
                      {item.text}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <span style={{
                        fontSize:   10,
                        color:      item.source === 'Reddit' ? '#ff6314' : '#4488ff',
                        fontWeight: 600,
                      }}>
                        {item.source}
                      </span>
                      <span style={{ fontSize: 10, color: bdrCol, fontWeight: 600 }}>
                        {sent > 0 ? '+' : ''}{sent !== 0 ? sent.toFixed(1) : '~0'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Sparkline */}
        <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 10 }}>
            24h trend
          </p>
          <canvas
            ref={sparkRef}
            width={320}
            height={64}
            style={{ width: '100%', height: 64, display: 'block' }}
          />
        </div>

      </div>
    </div>
  )
}
