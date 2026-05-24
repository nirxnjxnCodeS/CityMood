'use client'

import { useEffect, useRef, useState } from 'react'
import { City } from '@/lib/cities'
import MoodOrb, { orbColor } from './MoodOrb'

interface MoodData {
  score: number
  headlines: string[]
  weatherDesc: string
  cityId: string
  cityName: string
  ts: number
}

function moodLabel(score: number): string {
  if (score > 0.2) return 'Vibing ✦'
  if (score < -0.2) return 'Tense'
  return 'Calm'
}

function secsAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  return `${Math.floor(s / 60)}m ago`
}

interface Props {
  city: City
  isActive?: boolean
  onScoreUpdate?: (cityId: string, score: number) => void
}

export default function CityCard({ city, isActive, onScoreUpdate }: Props) {
  const [data, setData] = useState<MoodData | null>(null)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [, setTick] = useState(0)
  const receivedAtRef = useRef<number | null>(null)

  useEffect(() => {
    const es = new EventSource(`/api/stream/${city.id}`)
    es.onopen = () => setConnected(true)
    es.onmessage = (e) => {
      try {
        const parsed: MoodData = JSON.parse(e.data)
        setData(parsed)
        receivedAtRef.current = Date.now()
        setLoading(false)
        onScoreUpdate?.(city.id, parsed.score)
      } catch {}
    }
    es.onerror = () => setConnected(false)
    return () => es.close()
  }, [city.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // tick every second so "X seconds ago" updates live
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  if (loading) {
    return (
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 flex flex-col items-center gap-4 animate-pulse">
        <div className="w-[200px] h-[200px] rounded-full bg-zinc-800" />
        <div className="h-5 w-24 bg-zinc-800 rounded" />
        <div className="h-4 w-16 bg-zinc-800 rounded" />
        <div className="space-y-2 w-full">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-3 bg-zinc-800 rounded w-full" />
          ))}
        </div>
      </div>
    )
  }

  const score = data?.score ?? 0
  const color = orbColor(score)

  const cardStyle: React.CSSProperties = isActive
    ? {
        ['--glow-color' as string]: color,
        animation: 'activeBorder 2s ease-in-out infinite',
        borderColor: color,
      }
    : {}

  return (
    <div
      className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 flex flex-col items-center gap-3 transition-colors"
      style={cardStyle}
    >
      <div className="flex items-center justify-between w-full">
        <span className="text-xs text-zinc-600">
          {receivedAtRef.current ? `Updated ${secsAgo(receivedAtRef.current)}` : ''}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-zinc-600'}`} />
          <span className="text-xs text-zinc-500">{connected ? 'live' : 'reconnecting'}</span>
        </div>
      </div>

      <MoodOrb score={score} />

      <h2 className="text-xl font-semibold text-white">{city.name}</h2>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-zinc-300">{moodLabel(score)}</span>
        <span className="text-xs text-zinc-500">{score >= 0 ? '+' : ''}{score.toFixed(2)}</span>
      </div>
      {data?.weatherDesc && (
        <span className="text-xs text-zinc-500 capitalize">{data.weatherDesc}</span>
      )}

      <ul className="w-full space-y-1 mt-1">
        {data?.headlines.slice(0, 3).map((h, i) => (
          <li key={i} className="text-xs text-zinc-400 leading-snug line-clamp-2 border-l-2 border-zinc-700 pl-2">
            {h}
          </li>
        ))}
      </ul>
    </div>
  )
}
