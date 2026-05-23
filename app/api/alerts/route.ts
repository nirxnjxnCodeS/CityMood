import { NextRequest } from 'next/server'
import { subscribe, getPrevScores, MoodAlert } from '@/lib/alertEngine'
import { CITIES } from '@/lib/cities'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  console.log('[alerts] new SSE client connected')
  const enc = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      let alertFired = false

      const send = (data: string) => {
        try { controller.enqueue(enc.encode(data)) } catch { /* closed */ }
      }

      const unsub = subscribe(alert => {
        console.log(`[alerts] emitting alert: ${alert.cityName} ${alert.direction} ${alert.score.toFixed(3)}`)
        alertFired = true
        send(`data: ${JSON.stringify(alert)}\n\n`)
      })

      // Keepalive ping every 30s
      const ping = setInterval(() => {
        console.log('[alerts] checking cities... (keepalive ping)')
        send(': ping\n\n')
      }, 30_000)

      // Immediately emit any already-loaded extreme scores (cities whose stream loaded first)
      const existingScores = getPrevScores()
      if (existingScores.size > 0) {
        for (const city of CITIES) {
          const s = existingScores.get(city.id)
          if (s !== undefined && Math.abs(s) >= 0.05) {
            const immediateAlert: MoodAlert = {
              cityId:    city.id,
              cityName:  city.name,
              flag:      city.flag ?? '',
              prev:      0,
              score:     s,
              delta:     s,
              direction: s >= 0 ? 'up' : 'down',
              ts:        Date.now(),
            }
            console.log(`[alerts] emitting immediate alert: ${city.name} score=${s.toFixed(3)}`)
            send(`data: ${JSON.stringify(immediateAlert)}\n\n`)
            alertFired = true
            break // just one immediate alert on connect
          }
        }
      }

      // Demo alert after 5s if still nothing fired
      const demoTimer = setTimeout(() => {
        if (alertFired) return
        const scores = getPrevScores()
        if (scores.size === 0) return

        let extremeCity = CITIES[0]
        let extremeScore = 0
        for (const city of CITIES) {
          const s = scores.get(city.id)
          if (s !== undefined && Math.abs(s) > Math.abs(extremeScore)) {
            extremeScore = s
            extremeCity = city
          }
        }

        const demo: MoodAlert = {
          cityId:    extremeCity.id,
          cityName:  extremeCity.name,
          flag:      extremeCity.flag ?? '',
          prev:      extremeScore * 0.7,
          score:     extremeScore,
          delta:     extremeScore * 0.3,
          direction: extremeScore >= 0 ? 'up' : 'down',
          ts:        Date.now(),
        }
        console.log(`[alerts] emitting DEMO alert for ${extremeCity.name} (score=${extremeScore.toFixed(3)})`)
        send(`data: ${JSON.stringify(demo)}\n\n`)
      }, 5_000)

      req.signal.addEventListener('abort', () => {
        console.log('[alerts] SSE client disconnected')
        unsub()
        clearInterval(ping)
        clearTimeout(demoTimer)
        try { controller.close() } catch { /* already closed */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}
