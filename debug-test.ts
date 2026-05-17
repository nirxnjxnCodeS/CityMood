async function test() {
  const weatherKey = process.env.OPENWEATHER_KEY
  console.log('Weather key exists:', !!weatherKey)
  console.log('Weather key value:', weatherKey?.slice(0, 8) + '...')

  const weatherRes = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=12.97&lon=77.59&appid=${weatherKey}`
  )
  const weatherData = await weatherRes.json()
  console.log('Weather response:', JSON.stringify(weatherData, null, 2))

  const redditRes = await fetch(
    'https://www.reddit.com/r/bangalore/new.json?limit=5',
    { headers: { 'User-Agent': 'CityMood/1.0' } }
  )
  const redditData = await redditRes.json()
  const titles = redditData.data?.children?.map((p: any) => p.data.title)
  console.log('Reddit titles:', titles)

  const gnewsKey = process.env.GNEWS_KEY
  const newsRes = await fetch(
    `https://gnews.io/api/v4/search?q=bangalore&lang=en&max=5&token=${gnewsKey}`
  )
  const newsData = await newsRes.json()
  console.log('GNews response:', JSON.stringify(newsData?.articles?.slice(0,2), null, 2))
}

test().catch(console.error)
