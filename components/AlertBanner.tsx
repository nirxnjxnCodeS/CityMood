'use client'

import { useEffect, useRef, useState } from 'react'
import { MoodAlert } from '@/lib/alertEngine'

let _nextId = 0

export default function AlertBanner() {
  const [alerts, setAlerts] = useState<(MoodAlert & { _id: number })[]>([])
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const pushAlert = (alert: MoodAlert) => {
    const _id = ++_nextId
    setAlerts(prev => [{ ...alert, _id }, ...prev].slice(0, 3))
    const t = setTimeout(() => {
      setAlerts(prev => prev.filter(a => a._id !== _id))
      timersRef.current.delete(_id)
    }, 8000)
    timersRef.current.set(_id, t)
  }

  useEffect(() => {
    const es = new EventSource('/api/alerts')
    es.onopen  = () => console.log('[AlertBanner] SSE connected to /api/alerts')
    es.onerror = err => console.warn('[AlertBanner] SSE error', err)
    es.onmessage = e => {
      console.log('[AlertBanner] SSE message received:', e.data)
      try { pushAlert(JSON.parse(e.data) as MoodAlert) } catch { /* ignore */ }
    }
    return () => {
      es.close()
      timersRef.current.forEach(t => clearTimeout(t))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const testAlert = () => pushAlert({
    cityId: 'mumbai', cityName: 'Mumbai', flag: '🇮🇳',
    prev: 0.02, score: -0.31, delta: -0.33, direction: 'down', ts: Date.now(),
  })

  return (
    <>
      {/* Test trigger — remove once alerts are confirmed working */}
      <button
        onClick={testAlert}
        style={{
          position:   'fixed',
          bottom:     16,
          left:       16,
          zIndex:     9999,
          background: 'rgba(255,255,255,0.08)',
          border:     '1px solid rgba(255,255,255,0.2)',
          color:      '#fff',
          fontSize:   11,
          padding:    '6px 12px',
          borderRadius: 8,
          cursor:     'pointer',
        }}
      >
        Test Alert
      </button>

      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2" style={{ pointerEvents: 'none' }}>
        {alerts.map(alert => {
          const col  = alert.direction === 'up' ? '#22c55e' : '#ef4444'
          const icon = alert.direction === 'up' ? '↑' : '↓'
          const from = `${alert.prev >= 0 ? '+' : ''}${alert.prev.toFixed(2)}`
          const to   = `${alert.score >= 0 ? '+' : ''}${alert.score.toFixed(2)}`
          return (
            <div
              key={alert._id}
              className="rounded-xl px-4 py-3 w-72 overflow-hidden"
              style={{
                background: 'rgba(9,9,24,0.97)',
                border:     `1px solid ${col}`,
                boxShadow:  `0 0 20px ${col}33`,
                animation:  'alertSlideIn 0.25s ease-out',
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm text-white">
                  {alert.flag} {alert.cityName}
                </span>
                <span className="text-xs font-bold" style={{ color: col }}>
                  {icon} mood shift
                </span>
              </div>
              <p className="text-xs text-zinc-400">{from} → {to}</p>
              <div className="mt-2 h-0.5 rounded-full overflow-hidden" style={{ background: '#1f1f2e' }}>
                <div
                  className="h-full rounded-full"
                  style={{ background: col, animation: 'alertProgress 8s linear forwards' }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
