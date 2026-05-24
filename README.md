# CityMood

Real-time emotional pulse of 55 cities worldwide — powered by Reddit sentiment, live weather, and news headlines, rendered on an interactive 3D globe with breathing orbs.

## What it does

- **3D interactive globe** — Three.js globe with per-city pulsing dots coloured by live sentiment
- **55 cities, 5 continents** — continent nav bar with aggregated mood scores and fly-to camera
- **Live SSE streams** — server-sent events push mood updates to every connected client
- **City detail panel** — slide-over with 24h sparkline, mood breakdown bars, and live headlines
- **Alert system** — toast banner fires when a city's mood spikes or crashes sharply
- **Day/night rendering** — city dots glow brighter on the night side of the globe

## Data sources

| Source | Used for | Free tier limit |
|---|---|---|
| Reddit (public JSON) | Sentiment on all 55 cities | Unlimited (rate-limited) |
| OpenWeather | Weather mood on **13 tier-1 cities** | 1,000 calls/day |
| GNews | News headlines on **4 cities** (Bangalore, London, New York, Tokyo) | 10 calls/day |

### Two-tier city system

To stay within free API limits:

- **Tier 1 (13 cities)** — full data: Reddit + weather + news, polled every 60s
  - Bangalore, Mumbai, Trivandrum, Delhi, London, New York, Tokyo, Dubai, Berlin, Paris, Toronto, Sydney, Lagos
- **Tier 2 (42 cities)** — Reddit only, polled every 5 minutes
  - All other cities; shown with a "📡 Community data only" badge in the city panel

Startup fetches are staggered 500ms apart (≈27s ramp-up) to avoid slamming Reddit simultaneously. A max-2 concurrent request queue with 300ms cooldown prevents rate limiting.

**Daily API call budget:**
- OpenWeather: 13 × 48 polls = **624 calls/day** (limit: 1,000)
- GNews: 4 × 1 per 6hr cache = **4 calls/day** (limit: 10)

## Setup

```bash
git clone <your-repo-url>
cd CityMood
npm install
```

Create `.env.local`:

```
OPENWEATHER_KEY=your_key_here
GNEWS_KEY=your_key_here
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## API keys

- **OpenWeather** — [openweathermap.org/api](https://openweathermap.org/api) → "Current Weather Data" free plan → `OPENWEATHER_KEY`
- **GNews** — [gnews.io](https://gnews.io) → free plan (10 calls/day) → `GNEWS_KEY`

Both keys are optional — the app falls back gracefully to Reddit-only data if either is missing.

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

```bash
vercel --prod
```

Add `OPENWEATHER_KEY` and `GNEWS_KEY` in your Vercel project's environment variables dashboard.

## Tech stack

- **Next.js 15** App Router — SSE routes via `force-dynamic` route handlers
- **Three.js** — 3D globe, city dots, pulse rings, day/night terminator shader
- **CSS3D / `three/examples`** — city labels rendered as HTML overlaid on the WebGL canvas
- **Tailwind CSS** — utility classes for the page chrome
- No database — all state is in-memory with a warm cache seeded on server start
