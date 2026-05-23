import Sentiment from 'sentiment'

const analyzer = new Sentiment()

export function scoreText(text: string): number {
  if (!text || text.trim().length === 0) return 0
  const result = analyzer.analyze(text)
  if (result.tokens.length === 0) return 0
  // comparative is normalized per-word, roughly -5 to +5 — clamp to [-1, 1]
  return Math.max(-1, Math.min(1, result.comparative))
}
