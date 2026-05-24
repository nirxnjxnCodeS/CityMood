import { NextRequest } from 'next/server'
import { CITIES } from '@/lib/cities'
import { getCityMood } from '@/lib/pipeline'
import { checkAndAlert } from '@/lib/alertEngine'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { city: string } }
) {
  const city = CITIES.find(c => c.id === params.city)
  if (!city) {
    return new Response('City not found', { status: 404 })
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        try {
          const mood = await getCityMood(city)
          checkAndAlert(city.id, city.name, city.flag ?? '', mood.score)
          const payload = JSON.stringify({
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
          controller.enqueue(`data: ${payload}\n\n`)
        } catch {
          // silently skip on error — client will retry
        }
      }

      await send()
      const pollMs = city.tier === 2 ? 300_000 : 60_000
      const interval = setInterval(send, pollMs)

      req.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
