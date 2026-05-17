# CityMood

Real-time emotional pulse of cities worldwide — powered by Reddit sentiment, OpenWeather conditions, and live news headlines, all rendered as breathing orbs.

## Setup

```bash
git clone <your-repo-url>
cd CityMood
npm install
cp .env.local.example .env.local
# fill in your API keys in .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## API Keys (both free tier)

- **OpenWeather** — [openweathermap.org/api](https://openweathermap.org/api) → "Current Weather Data" free plan → add as `OPENWEATHER_KEY`
- **NewsAPI** — [newsapi.org/register](https://newsapi.org/register) → free developer key → add as `NEWS_API_KEY`

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

```bash
# one-time setup
npm i -g vercel

# deploy
git init && git add . && git commit -m "init"
gh repo create citymood --public --push --source=.
vercel --prod
```

Set `OPENWEATHER_KEY` and `NEWS_API_KEY` in your Vercel project environment variables.
