import { scoreText } from '../sentiment'

// Max 2 concurrent Reddit requests; 300ms cooldown between queue releases.
let activeRequests = 0
const queue: Array<() => void> = []

async function acquireSlot(): Promise<void> {
  if (activeRequests < 2) {
    activeRequests++
    return
  }
  await new Promise<void>(resolve => queue.push(resolve))
  activeRequests++
}

function releaseSlot(): void {
  activeRequests--
  if (queue.length > 0) {
    const next = queue.shift()!
    setTimeout(next, 300)
  }
}

const POSITIVE_BOOST = new Set([
  'won','win','celebrate','amazing','love','beautiful','great','awesome',
  'happy','excited','proud','record','best','festival','party','success','milestone',
])

const NEGATIVE_BOOST = new Set([
  'died','dead','murder','rape','flood','fire','crash','scam','fraud',
  'riot','protest','strike','arrest','attack','bomb','terror','accident',
  'suicide','corrupt','banned','shutdown','collapsed','killed',
])

interface Post {
  id: string
  title: string
  selftext: string
  url: string
}

export interface RedditResult {
  score: number
  titles: string[]
}

function scorePost(post: Post): number {
  const text = `${post.title} ${post.selftext} ${post.url}`
  let s = scoreText(text)
  const words = post.title.toLowerCase().split(/\W+/)
  for (const word of words) {
    if (POSITIVE_BOOST.has(word)) s += 0.3
    else if (NEGATIVE_BOOST.has(word)) s -= 0.3
  }
  return Math.max(-1, Math.min(1, s))
}

async function fetchPosts(subreddit: string, sort: 'new' | 'hot', limit: number): Promise<Post[]> {
  await acquireSlot()
  try {
    const res = await fetch(
      `https://www.reddit.com/r/${subreddit}/${sort}.json?limit=${limit}`,
      { headers: { 'User-Agent': 'CityMood/1.0' }, next: { revalidate: 0 } }
    )
    if (!res.ok) throw new Error(`reddit ${sort} ${res.status}`)
    const json = await res.json()
    return json?.data?.children?.map((c: { data: Post }) => c.data) ?? []
  } finally {
    releaseSlot()
  }
}

export async function getRedditSentiment(subreddit: string): Promise<RedditResult> {
  try {
    const [newResult, hotResult] = await Promise.allSettled([
      fetchPosts(subreddit, 'new', 50),
      fetchPosts(subreddit, 'hot', 50),
    ])

    const all: Post[] = []
    if (newResult.status === 'fulfilled') all.push(...newResult.value)
    if (hotResult.status === 'fulfilled') all.push(...hotResult.value)

    // Deduplicate by post id
    const seen = new Set<string>()
    const unique = all.filter(p => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })

    if (unique.length === 0) return { score: 0, titles: [] }

    const scored = unique.map(p => ({ title: p.title, score: scorePost(p) }))
    const score = scored.reduce((a, b) => a + b.score, 0) / scored.length

    const sorted = [...scored].sort((a, b) => b.score - a.score)
    const fmt = (p: { score: number; title: string }) =>
      `${p.score.toFixed(2)} "${p.title.slice(0, 70)}"`
    console.log(`[reddit:${subreddit}] final=${score.toFixed(3)} posts=${scored.length}`)
    console.log(`  top 3:   `, sorted.slice(0, 3).map(fmt))
    console.log(`  bottom 3:`, sorted.slice(-3).reverse().map(fmt))

    return { score, titles: unique.map(p => p.title) }
  } catch (err) {
    console.error('[reddit] failed:', err)
    return { score: 0, titles: [] }
  }
}
