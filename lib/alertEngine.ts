export interface MoodAlert {
  cityId: string
  cityName: string
  flag: string
  prev: number
  score: number
  delta: number
  direction: 'up' | 'down'
  ts: number
}

type Listener = (alert: MoodAlert) => void

const prevScores = new Map<string, number>()
const listeners  = new Set<Listener>()

const THRESHOLD       = 0.03
const FIRST_LOAD_MIN  = 0.05

export function checkAndAlert(
  cityId: string,
  cityName: string,
  flag: string,
  score: number,
): void {
  const prev = prevScores.get(cityId)
  prevScores.set(cityId, score)

  if (prev === undefined) {
    // First load — alert immediately if score is extreme
    if (Math.abs(score) >= FIRST_LOAD_MIN) {
      const alert: MoodAlert = {
        cityId, cityName, flag,
        prev: 0, score, delta: score,
        direction: score > 0 ? 'up' : 'down',
        ts: Date.now(),
      }
      console.log(`[alertEngine] first-load alert: ${cityName} score=${score.toFixed(3)}`)
      listeners.forEach(cb => cb(alert))
    }
    return
  }

  const delta = score - prev
  if (Math.abs(delta) < THRESHOLD) return

  const alert: MoodAlert = {
    cityId, cityName, flag, prev, score, delta,
    direction: delta > 0 ? 'up' : 'down',
    ts: Date.now(),
  }
  console.log(`[alertEngine] delta alert: ${cityName} ${prev.toFixed(3)} → ${score.toFixed(3)} Δ${delta.toFixed(3)}`)
  listeners.forEach(cb => cb(alert))
}

export function subscribe(cb: Listener): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function getPrevScores(): Map<string, number> {
  return prevScores
}
