// TODO: upgrade to paid GNews plan for production — free tier exhausted at 10 calls/day

export async function getNewsSentiment(
  _cityId: string,
  _cityName: string,
  _cityIndex: number,
): Promise<{ score: number; headlines: string[] }> {
  return { score: 0, headlines: [] }
}
