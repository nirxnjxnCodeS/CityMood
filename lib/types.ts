export interface MoodData {
  score: number
  headlines: string[]
  redditTitles?: string[]
  weatherDesc: string
  tempK?: number
  sourceScores?: { reddit: number; weather: number; news: number }
  history?: { score: number; ts: number }[]
  cityId: string
  cityName: string
  ts: number
}
