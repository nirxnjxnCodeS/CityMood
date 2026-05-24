const WEATHER_TTL = 1_800_000 // 30 minutes

interface WeatherCacheEntry {
  score: number
  description: string
  tempK: number
  ts: number
}

const weatherCache = new Map<string, WeatherCacheEntry>()

function weatherScore(id: number): number {
  if (id === 800) return 0.5
  if (id >= 801 && id <= 804) return 0.1
  if (id >= 500 && id <= 531) return -0.4
  if (id >= 200 && id <= 232) return -0.8
  if (id >= 600 && id <= 622) return -0.2
  if (id >= 700 && id <= 781) return -0.1
  return 0
}

export async function getWeatherMood(
  lat: number,
  lon: number,
  cityId: string,
  tier: 1 | 2 = 1,
): Promise<{ score: number; description: string; tempK: number }> {
  if (tier === 2) return { score: 0, description: 'N/A', tempK: 0 }

  const cached = weatherCache.get(cityId)

  if (cached && Date.now() - cached.ts < WEATHER_TTL) {
    return { score: cached.score, description: cached.description, tempK: cached.tempK }
  }

  const key = process.env.OPENWEATHER_KEY
  if (!key) {
    console.error('[weather] OPENWEATHER_KEY is not set')
    return cached
      ? { score: cached.score, description: cached.description, tempK: cached.tempK }
      : { score: 0, description: 'unknown', tempK: 293 }
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${key}`
    const res  = await fetch(url, { cache: 'no-store' })
    const json = await res.json()

    console.log('[weather] status:', res.status, 'body:', JSON.stringify(json).slice(0, 200))

    if (!res.ok) {
      console.error('[weather] API error:', json?.message ?? res.status)
      return cached
        ? { score: cached.score, description: cached.description, tempK: cached.tempK }
        : { score: 0, description: 'unknown', tempK: 293 }
    }

    const id: number          = json.weather?.[0]?.id ?? 800
    const description: string = json.weather?.[0]?.description ?? 'clear sky'
    const tempK: number       = json.main?.temp ?? 293
    const result = { score: weatherScore(id), description, tempK, ts: Date.now() }
    weatherCache.set(cityId, result)
    return { score: result.score, description: result.description, tempK: result.tempK }
  } catch (err) {
    console.error('[weather] fetch failed:', err)
    return cached
      ? { score: cached.score, description: cached.description, tempK: cached.tempK }
      : { score: 0, description: 'unknown', tempK: 293 }
  }
}
