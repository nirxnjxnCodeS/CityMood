'use client'

import { useEffect, useRef, useState } from 'react'
import { City } from '@/lib/cities'

interface Props {
  cities: City[]
  scores: Record<string, number>
  postsAnalyzed: number
}

export default function StatsBar({ cities, scores, postsAnalyzed }: Props) {
  const [countdown, setCountdown] = useState(60)
  const lastTsRef = useRef(Date.now())

  // Reset countdown whenever postsAnalyzed increments (= new SSE data arrived)
  useEffect(() => {
    lastTsRef.current = Date.now()
    setCountdown(60)
  }, [postsAnalyzed])

  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastTsRef.current) / 1000)
      setCountdown(Math.max(0, 60 - elapsed))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const entries = Object.entries(scores)
  const happiest = entries.reduce<[string, number] | null>(
    (best, [id, s]) => best === null || s > best[1] ? [id, s] : best, null,
  )
  const tensest = entries.reduce<[string, number] | null>(
    (worst, [id, s]) => worst === null || s < worst[1] ? [id, s] : worst, null,
  )
  const happiestCity = happiest ? cities.find(c => c.id === happiest[0]) : null
  const tensestCity  = tensest  ? cities.find(c => c.id === tensest[0])  : null

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-950/60 text-xs mt-4">
      <div className="flex items-center gap-1.5">
        <span className="text-zinc-600">Posts analyzed</span>
        <span className="font-mono text-white font-medium">{postsAnalyzed.toLocaleString()}</span>
      </div>

      {happiestCity && (
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-600">Happiest</span>
          <span className="font-medium text-green-400">{happiestCity.flag} {happiestCity.name}</span>
          <span className="text-green-700">
            {happiest![1] >= 0 ? '+' : ''}{happiest![1].toFixed(2)}
          </span>
        </div>
      )}

      {tensestCity && tensestCity.id !== happiestCity?.id && (
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-600">Tensest</span>
          <span className="font-medium text-red-400">{tensestCity.flag} {tensestCity.name}</span>
          <span className="text-red-700">
            {tensest![1] >= 0 ? '+' : ''}{tensest![1].toFixed(2)}
          </span>
        </div>
      )}

      <div className="flex items-center gap-1.5 ml-auto">
        <span className="text-zinc-600">Next refresh</span>
        <span className="font-mono text-zinc-300">{countdown}s</span>
      </div>
    </div>
  )
}
