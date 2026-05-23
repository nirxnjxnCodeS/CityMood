import { scoreText } from '../sentiment'

const NEWS_TTL = 21_600_000 // 6 hours

interface NewsCacheEntry {
  score: number
  headlines: string[]
  ts: number
}

const newsCache = new Map<string, NewsCacheEntry>()

export async function getNewsSentiment(
  cityId: string,
  cityName: string,
  cityIndex: number,
): Promise<{ score: number; headlines: string[] }> {
  const cached = newsCache.get(cityId)

  // Fresh cache — always return it, skip network entirely
  if (cached && Date.now() - cached.ts < NEWS_TTL) {
    return { score: cached.score, headlines: cached.headlines }
  }

  // Cache is stale or absent — only fetch during this city's slot in the 4-minute rotation
  const isOurSlot = Math.floor(Date.now() / 60_000) % 4 === cityIndex
  if (!isOurSlot) {
    return cached
      ? { score: cached.score, headlines: cached.headlines }
      : { score: 0, headlines: [] }
  }

  const key = process.env.GNEWS_KEY
  if (!key) {
    console.error('[news] GNEWS_KEY is not set')
    return cached ? { score: cached.score, headlines: cached.headlines } : { score: 0, headlines: [] }
  }

  try {
    const res = await fetch(
      `https://gnews.io/api/v4/search?q=${encodeURIComponent(cityName)}&lang=en&max=10&apikey=${key}`,
      { cache: 'no-store' }
    )
    const json = await res.json()

    if (!res.ok || json.errors) {
      const isRateLimit = res.status === 429 ||
        (json.errors as string[] | undefined)?.some((e: string) => e.toLowerCase().includes('too many'))
      console.error(`[news] GNews error (${isRateLimit ? 'rate limit' : res.status}):`, json.errors ?? res.status)
      return cached ? { score: cached.score, headlines: cached.headlines } : { score: 0, headlines: [] }
    }

    const articles: { title: string; description?: string }[] = json.articles ?? []
    if (articles.length === 0) {
      return cached ? { score: cached.score, headlines: cached.headlines } : { score: 0, headlines: [] }
    }

    const headlines = articles.map(a => a.title).filter(Boolean)
    const scores = articles.map(a => scoreText(a.title + ' ' + (a.description || '')))
    const score = scores.reduce((a, b) => a + b, 0) / scores.length

    newsCache.set(cityId, { score, headlines, ts: Date.now() })
    return { score, headlines }
  } catch (err) {
    console.error('[news] fetch failed:', err)
    return cached ? { score: cached.score, headlines: cached.headlines } : { score: 0, headlines: [] }
  }
}
