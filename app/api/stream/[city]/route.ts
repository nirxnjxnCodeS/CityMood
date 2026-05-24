import { NextRequest } from 'next/server'
import { CITIES } from '@/lib/cities'
import { getCityMood } from '@/lib/pipeline'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { city: string } }
) {
  const city = CITIES.find(c => c.id === params.city)
  if (!city) return Response.json({ error: 'City not found' }, { status: 404 })

  const mood = await getCityMood(city)
  return Response.json({
    score:        mood.score,
    headlines:    mood.headlines,
    redditTitles: mood.redditTitles,
    weatherDesc:  mood.weatherDesc,
    tempK:        mood.tempK,
    sourceScores: mood.sourceScores,
    history:      mood.history,
    cityId:       city.id,
    cityName:     city.name,
    ts:           mood.ts,
  })
}
