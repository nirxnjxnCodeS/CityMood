'use client'

import { useState } from 'react'
import { City, CONTINENTS } from '@/lib/cities'

const CONTINENT_EMOJI: Record<string, string> = {
  Africa:   '🌍',
  Asia:     '🌏',
  Europe:   '🌍',
  Americas: '🌎',
  Oceania:  '🌏',
}

interface Props {
  cities:           City[]
  scores:           Record<string, number>
  activeContinent:  string
  onContinentClick: (name: string) => void
}

function moodBg(score: number): string {
  if (score > 0.1)  return 'rgba(34,197,94,0.15)'
  if (score < -0.1) return 'rgba(239,68,68,0.15)'
  return 'rgba(255,255,255,0.05)'
}

function moodBorder(score: number): string {
  if (score > 0.1)  return 'rgba(34,197,94,0.4)'
  if (score < -0.1) return 'rgba(239,68,68,0.4)'
  return 'rgba(255,255,255,0.12)'
}

function moodTextColor(score: number): string {
  if (score > 0.1)  return '#4ade80'
  if (score < -0.1) return '#f87171'
  return 'rgba(255,255,255,0.6)'
}

export default function ContinentBar({ cities, scores, activeContinent, onContinentClick }: Props) {
  const [hoveredContinent, setHoveredContinent] = useState<string | null>(null)

  const continentData = Object.entries(CONTINENTS).map(([name, cityIds]) => {
    const continentCities = cityIds
      .map(id => cities.find(c => c.id === id))
      .filter(Boolean) as City[]
    const scoredCities = continentCities.filter(c => scores[c.id] !== undefined)
    const avg = scoredCities.length > 0
      ? scoredCities.reduce((sum, c) => sum + scores[c.id], 0) / scoredCities.length
      : 0
    const sorted = [...scoredCities].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0))
    return {
      name,
      avg,
      total: continentCities.length,
      scored: scoredCities.length,
      happiest: sorted[0],
      tensest:  sorted[sorted.length - 1],
    }
  })

  return (
    <div style={{ position: 'relative', marginBottom: 12, overflow: 'visible' }}>
      <div style={{
        display:    'flex',
        flexWrap:   'wrap',
        gap:        8,
        paddingBottom: 4,
      }}>
        {/* All continents reset pill */}
        <button
          onClick={() => onContinentClick('')}
          style={{
            flexShrink:   0,
            padding:      '6px 14px',
            borderRadius: 20,
            fontSize:     12,
            fontWeight:   500,
            cursor:       'pointer',
            border:       activeContinent === '' ? '1px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.12)',
            background:   activeContinent === '' ? 'rgba(255,255,255,0.12)' : 'transparent',
            color:        activeContinent === '' ? '#fff' : 'rgba(255,255,255,0.5)',
            transition:   'all 0.15s ease',
            whiteSpace:   'nowrap',
          }}
        >
          🌐 All
        </button>

        {continentData.map(({ name, avg, total, scored, happiest, tensest }) => {
          const isActive  = activeContinent === name
          const isHovered = hoveredContinent === name
          return (
            <div key={name} style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => onContinentClick(name)}
                onMouseEnter={() => setHoveredContinent(name)}
                onMouseLeave={() => setHoveredContinent(null)}
                style={{
                  padding:      '6px 14px',
                  borderRadius: 20,
                  fontSize:     12,
                  fontWeight:   500,
                  cursor:       'pointer',
                  border:       `1px solid ${isActive ? moodBorder(avg) : 'rgba(255,255,255,0.12)'}`,
                  background:   isActive ? moodBg(avg) : isHovered ? 'rgba(255,255,255,0.06)' : 'transparent',
                  color:        isActive ? moodTextColor(avg) : 'rgba(255,255,255,0.5)',
                  transition:   'all 0.15s ease',
                  display:      'flex',
                  alignItems:   'center',
                  gap:          6,
                  whiteSpace:   'nowrap',
                }}
              >
                <span>{CONTINENT_EMOJI[name]}</span>
                <span>{name}</span>
                {scored > 0 && (
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: moodTextColor(avg) }}>
                    {avg >= 0 ? '+' : ''}{avg.toFixed(2)}
                  </span>
                )}
              </button>

              {/* Hover tooltip */}
              {isHovered && scored > 0 && (
                <div style={{
                  position:   'absolute',
                  bottom:     '110%',
                  left:       '50%',
                  transform:  'translateX(-50%)',
                  background: 'rgba(9,9,24,0.97)',
                  border:     '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10,
                  padding:    '10px 12px',
                  width:      200,
                  zIndex:     200,
                  pointerEvents: 'none',
                  boxShadow:  '0 4px 20px rgba(0,0,0,0.6)',
                }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#fff', marginBottom: 6 }}>
                    {CONTINENT_EMOJI[name]} {name}
                  </p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                    {scored}/{total} cities reporting
                  </p>
                  {happiest && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>Happiest</span>
                      <span style={{ color: '#4ade80', fontWeight: 600 }}>
                        {happiest.flag} {happiest.name} {scores[happiest.id] >= 0 ? '+' : ''}{scores[happiest.id]?.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {tensest && tensest.id !== happiest?.id && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>Tensest</span>
                      <span style={{ color: '#f87171', fontWeight: 600 }}>
                        {tensest.flag} {tensest.name} {scores[tensest.id] >= 0 ? '+' : ''}{scores[tensest.id]?.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
