import { City } from './cities'
import { getRedditSentiment } from './sources/reddit'
import { getWeatherMood } from './sources/weather'
import { getNewsSentiment } from './sources/news'

interface HistoryPoint { score: number; ts: number }

interface MoodResult {
  score: number
  headlines: string[]
  redditTitles: string[]
  weatherDesc: string
  tempK: number
  sourceScores: { reddit: number; weather: number; news: number }
  history: HistoryPoint[]
  ts: number
}

const CACHE       = new Map<string, MoodResult>()
const moodHistory = new Map<string, HistoryPoint[]>()
const TTL         = 60_000
const MAX_HISTORY = 24

export { CACHE }

// On first load, synthesise 23 past hourly points so the sparkline is never empty.
function seedHistory(cityId: string, seed: number): void {
  if (moodHistory.has(cityId)) return
  const now = Date.now()
  const pts: HistoryPoint[] = []
  let s = seed
  for (let i = 23; i >= 1; i--) {
    s = Math.max(-1, Math.min(1, s + (Math.random() - 0.5) * 0.12))
    pts.push({ score: +s.toFixed(3), ts: now - i * 3_600_000 })
  }
  // loop pushes i=23 first (oldest) → i=1 last (most recent): already chronological
  moodHistory.set(cityId, pts)
}

export async function getCityMood(city: City): Promise<MoodResult> {
  const cached = CACHE.get(city.id)
  if (cached && Date.now() - cached.ts < TTL) return cached

  const [reddit, weather, news] = await Promise.all([
    getRedditSentiment(city.subreddit),
    getWeatherMood(city.lat, city.lon, city.id),
    getNewsSentiment(city.id, city.name, city.index),
  ])

  console.log(`[${city.name}] reddit titles (first 5):`, reddit.titles.slice(0, 5))
  console.log(`[${city.name}] reddit=${reddit.score.toFixed(3)} weather=${weather.score.toFixed(3)} news=${news.score.toFixed(3)} final=${(reddit.score * 0.4 + weather.score * 0.25 + news.score * 0.35).toFixed(3)}`)

  const clampedScore = Math.max(-1, Math.min(1, reddit.score * 0.4 + weather.score * 0.25 + news.score * 0.35))
  const ts = Date.now()

  seedHistory(city.id, clampedScore)
  const hist = moodHistory.get(city.id)!
  hist.push({ score: +clampedScore.toFixed(3), ts })
  if (hist.length > MAX_HISTORY) hist.shift()

  const result: MoodResult = {
    score:        clampedScore,
    headlines:    news.headlines,
    redditTitles: reddit.titles,
    weatherDesc:  weather.description,
    tempK:        weather.tempK,
    sourceScores: { reddit: reddit.score, weather: weather.score, news: news.score },
    history:      [...hist],
    ts,
  }

  CACHE.set(city.id, result)
  return result
}
