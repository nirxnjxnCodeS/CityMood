'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useState } from 'react'
import { CITIES, City, CONTINENT_CENTERS } from '@/lib/cities'
import { MoodData } from '@/lib/types'
import CityCard from '@/components/CityCard'
import AlertBanner from '@/components/AlertBanner'
import StatsBar from '@/components/StatsBar'
import CityPanel from '@/components/CityPanel'
import ContinentBar from '@/components/ContinentBar'

const WorldMap = dynamic(() => import('@/components/WorldMap'), { ssr: false })

let idCounter = 0

export default function Home() {
  const [cities, setCities]     = useState<City[]>(CITIES)
  const [showAdd, setShowAdd]   = useState(false)
  const [newName, setNewName]   = useState('')
  const [newSub, setNewSub]     = useState('')
  const [scores, setScores]         = useState<Record<string, number>>({})
  const [toast, setToast]           = useState(false)
  const [selectedPanel, setSelectedPanel] = useState<{ city: City; data: MoodData } | null>(null)
  const [activeFilter,     setActiveFilter]     = useState<string>('all')
  const [showHeatmap,      setShowHeatmap]      = useState(false)
  const [continentFilter,  setContinentFilter]  = useState('')
  const [flyTo,            setFlyTo]            = useState<{ lat: number; lon: number; distance?: number } | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted]   = useState(false)
  const [updateCount, setUpdateCount] = useState(0)

  useEffect(() => {
    setMounted(true)
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleScoreUpdate = useCallback((cityId: string, score: number) => {
    setScores(prev => ({ ...prev, [cityId]: score }))
    setUpdateCount(prev => prev + 1)
  }, [])

  const handleContinentClick = useCallback((name: string) => {
    setContinentFilter(name)
    setActiveFilter('all')
    if (!name) {
      setFlyTo({ lat: 0, lon: 0, distance: 6 })
    } else {
      const center = CONTINENT_CENTERS[name]
      if (center) setFlyTo({ ...center, distance: 4 })
    }
  }, [])

  const handleCityClick = useCallback((cityId: string, data: MoodData) => {
    const city = CITIES.find(c => c.id === cityId)
    if (city) setSelectedPanel({ city, data })
  }, [])

  const mostActiveId = Object.entries(scores).reduce<string | null>((best, [id, s]) => {
    if (best === null) return id
    return Math.abs(s) > Math.abs(scores[best] ?? 0) ? id : best
  }, null)

  const addCity = () => {
    if (!newName.trim() || !newSub.trim()) return
    const id = `custom-${++idCounter}`
    setCities(prev => [
      ...prev,
      { id, name: newName.trim(), subreddit: newSub.trim(), lat: 0, lon: 0, country: '', index: prev.length % 4, tier: 2 },
    ])
    setNewName('')
    setNewSub('')
    setShowAdd(false)
  }

  const share = async () => {
    try { await navigator.clipboard.writeText(window.location.href) } catch { /* ignore */ }
    setToast(true)
  }

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(false), 2000)
    return () => clearTimeout(id)
  }, [toast])

  return (
    <main className="min-h-screen text-white" style={{ background: '#050510' }}>
      <AlertBanner />
      {selectedPanel && (
        <CityPanel
          city={selectedPanel.city}
          data={selectedPanel.data}
          onClose={() => setSelectedPanel(null)}
        />
      )}

      <div className="max-w-screen-xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">CityMood</h1>
            <p className="text-zinc-400 mt-1">
              Monitoring {cities.length} cities across 6 continents · Live emotional pulse
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 text-green-400 text-xs font-medium px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              LIVE
            </span>
          </div>
        </div>

        {/* Filter pills */}
        {!isMobile && (
          <div className="flex flex-wrap gap-2 mb-3">
            {([
              { id: 'all',    label: '🌍 All' },
              { id: 'vibing', label: '😊 Vibing' },
              { id: 'calm',   label: '😐 Calm' },
              { id: 'tense',  label: '😤 Tense' },
              { id: 'night',  label: '🌙 Night Side' },
            ] as const).map(f => (
              <button
                key={f.id}
                onClick={() => { setActiveFilter(f.id); setContinentFilter('') }}
                style={{
                  padding:      '5px 14px',
                  borderRadius: 20,
                  fontSize:     12,
                  fontWeight:   500,
                  cursor:       'pointer',
                  border:       '1px solid rgba(255,255,255,0.15)',
                  background:   activeFilter === f.id && !continentFilter ? '#fff' : 'transparent',
                  color:        activeFilter === f.id && !continentFilter ? '#050510' : 'rgba(255,255,255,0.5)',
                  transition:   'all 0.15s ease',
                }}
              >
                {f.label}
              </button>
            ))}
            {/* Heatmap toggle */}
            <button
              onClick={() => setShowHeatmap(h => !h)}
              style={{
                padding:      '5px 14px',
                borderRadius: 20,
                fontSize:     12,
                fontWeight:   500,
                cursor:       'pointer',
                border:       showHeatmap ? '1px solid rgba(255,150,50,0.6)' : '1px solid rgba(255,255,255,0.15)',
                background:   showHeatmap ? 'rgba(255,150,50,0.15)' : 'transparent',
                color:        showHeatmap ? '#ffaa44' : 'rgba(255,255,255,0.5)',
                transition:   'all 0.15s ease',
              }}
            >
              🌡️ Heatmap
            </button>
          </div>
        )}

        {/* Continent bar */}
        {!isMobile && mounted && (
          <ContinentBar
            cities={cities}
            scores={scores}
            activeContinent={continentFilter}
            onContinentClick={handleContinentClick}
          />
        )}

        {/* Map (desktop) or card grid (mobile) */}
        {!mounted ? (
          <div
            className="w-full rounded-2xl animate-pulse"
            style={{ height: '65vh', minHeight: 320, background: '#0d0d1a' }}
          />
        ) : isMobile ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {cities.slice(0, 4).map(city => (
              <CityCard
                key={city.id}
                city={city}
                isActive={city.id === mostActiveId}
                onScoreUpdate={handleScoreUpdate}
              />
            ))}
          </div>
        ) : (
          <div className="mb-6">
            <WorldMap
            cities={cities}
            onScoreUpdate={handleScoreUpdate}
            onCityClick={handleCityClick}
            onBgClick={() => setSelectedPanel(null)}
            activeFilter={activeFilter}
            heatmapActive={showHeatmap}
            continentFilter={continentFilter}
            flyTo={flyTo}
          />
          </div>
        )}

        {/* Stats bar */}
        <StatsBar cities={cities} scores={scores} postsAnalyzed={updateCount * 25} />

        {/* Add city */}
        <div className="mt-5 mb-6">
          {showAdd ? (
            <div className="flex flex-wrap gap-2 items-center">
              <input
                className="bg-zinc-900 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 w-40 focus:outline-none focus:border-zinc-500"
                placeholder="City name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
              <input
                className="bg-zinc-900 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 w-44 focus:outline-none focus:border-zinc-500"
                placeholder="Subreddit (e.g. tokyo)"
                value={newSub}
                onChange={e => setNewSub(e.target.value)}
              />
              <button
                onClick={addCity}
                className="bg-white text-zinc-950 text-sm font-medium px-4 py-2 rounded-lg hover:bg-zinc-200 transition"
              >
                Add
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="text-zinc-500 text-sm hover:text-white transition"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="text-sm text-zinc-400 border border-zinc-700 px-4 py-2 rounded-lg hover:border-zinc-500 hover:text-white transition"
            >
              + Add city
            </button>
          )}
        </div>

        {/* Legend + share */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-5 items-center">
            <span className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
              Positive mood
            </span>
            <span className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
              Tense mood
            </span>
            <span className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="w-3 h-3 rounded-full inline-block bg-zinc-600" />
              Neutral
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={share}
                className="text-xs text-zinc-400 border border-zinc-700 px-3 py-1.5 rounded-lg hover:border-zinc-500 hover:text-white transition flex items-center gap-1.5"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                Share
              </button>
              {toast && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap border border-zinc-700 shadow-lg">
                  Link copied!
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}
