export interface City {
  id: string
  name: string
  subreddit: string
  lat: number
  lon: number
  country: string
  index: number
  flag?: string
}

export const CITIES: City[] = [
  // ── Original 13 ───────────────────────────────────────────────────────────
  { id: 'bangalore',  name: 'Bangalore',    subreddit: 'bangalore', lat: 12.97,   lon: 77.59,   country: 'IN', index: 0,  flag: '🇮🇳' },
  { id: 'mumbai',     name: 'Mumbai',       subreddit: 'mumbai',    lat: 19.07,   lon: 72.87,   country: 'IN', index: 1,  flag: '🇮🇳' },
  { id: 'london',     name: 'London',       subreddit: 'london',    lat: 51.50,   lon: -0.12,   country: 'GB', index: 2,  flag: '🇬🇧' },
  { id: 'new-york',   name: 'New York',     subreddit: 'nyc',       lat: 40.71,   lon: -74.00,  country: 'US', index: 3,  flag: '🇺🇸' },
  { id: 'tokyo',      name: 'Tokyo',        subreddit: 'tokyo',     lat: 35.68,   lon: 139.69,  country: 'JP', index: 0,  flag: '🇯🇵' },
  { id: 'dubai',      name: 'Dubai',        subreddit: 'dubai',     lat: 25.20,   lon: 55.27,   country: 'AE', index: 1,  flag: '🇦🇪' },
  { id: 'berlin',     name: 'Berlin',       subreddit: 'berlin',    lat: 52.52,   lon: 13.40,   country: 'DE', index: 2,  flag: '🇩🇪' },
  { id: 'sydney',     name: 'Sydney',       subreddit: 'sydney',    lat: -33.87,  lon: 151.21,  country: 'AU', index: 3,  flag: '🇦🇺' },
  { id: 'sao-paulo',  name: 'São Paulo',    subreddit: 'saopaulo',  lat: -23.55,  lon: -46.63,  country: 'BR', index: 0,  flag: '🇧🇷' },
  { id: 'lagos',      name: 'Lagos',        subreddit: 'lagos',     lat: 6.52,    lon: 3.38,    country: 'NG', index: 1,  flag: '🇳🇬' },
  { id: 'toronto',    name: 'Toronto',      subreddit: 'toronto',   lat: 43.65,   lon: -79.38,  country: 'CA', index: 2,  flag: '🇨🇦' },
  { id: 'paris',      name: 'Paris',        subreddit: 'paris',     lat: 48.85,   lon: 2.35,    country: 'FR', index: 3,  flag: '🇫🇷' },
  { id: 'trivandrum', name: 'Trivandrum',   subreddit: 'Kerala',    lat: 8.5241,  lon: 76.9366, country: 'IN', index: 0,  flag: '🇮🇳' },

  // ── Europe ────────────────────────────────────────────────────────────────
  { id: 'amsterdam',  name: 'Amsterdam',    subreddit: 'amsterdam', lat: 52.37,   lon: 4.90,    country: 'NL', index: 1,  flag: '🇳🇱' },
  { id: 'madrid',     name: 'Madrid',       subreddit: 'madrid',    lat: 40.42,   lon: -3.70,   country: 'ES', index: 2,  flag: '🇪🇸' },
  { id: 'rome',       name: 'Rome',         subreddit: 'rome',      lat: 41.90,   lon: 12.50,   country: 'IT', index: 3,  flag: '🇮🇹' },
  { id: 'stockholm',  name: 'Stockholm',    subreddit: 'stockholm', lat: 59.33,   lon: 18.07,   country: 'SE', index: 0,  flag: '🇸🇪' },
  { id: 'vienna',     name: 'Vienna',       subreddit: 'vienna',    lat: 48.21,   lon: 16.37,   country: 'AT', index: 1,  flag: '🇦🇹' },
  { id: 'warsaw',     name: 'Warsaw',       subreddit: 'warsaw',    lat: 52.23,   lon: 21.01,   country: 'PL', index: 2,  flag: '🇵🇱' },
  { id: 'brussels',   name: 'Brussels',     subreddit: 'brussels',  lat: 50.85,   lon: 4.35,    country: 'BE', index: 3,  flag: '🇧🇪' },
  { id: 'zurich',     name: 'Zurich',       subreddit: 'zurich',    lat: 47.38,   lon: 8.54,    country: 'CH', index: 0,  flag: '🇨🇭' },

  // ── Asia ──────────────────────────────────────────────────────────────────
  { id: 'singapore',  name: 'Singapore',    subreddit: 'singapore', lat: 1.35,    lon: 103.82,  country: 'SG', index: 1,  flag: '🇸🇬' },
  { id: 'bangkok',    name: 'Bangkok',      subreddit: 'bangkok',   lat: 13.75,   lon: 100.52,  country: 'TH', index: 2,  flag: '🇹🇭' },
  { id: 'seoul',      name: 'Seoul',        subreddit: 'korea',     lat: 37.57,   lon: 126.98,  country: 'KR', index: 3,  flag: '🇰🇷' },
  { id: 'beijing',    name: 'Beijing',      subreddit: 'china',     lat: 39.91,   lon: 116.39,  country: 'CN', index: 0,  flag: '🇨🇳' },
  { id: 'shanghai',   name: 'Shanghai',     subreddit: 'shanghai',  lat: 31.23,   lon: 121.47,  country: 'CN', index: 1,  flag: '🇨🇳' },
  { id: 'hong-kong',  name: 'Hong Kong',    subreddit: 'hongkong',  lat: 22.32,   lon: 114.17,  country: 'HK', index: 2,  flag: '🇭🇰' },
  { id: 'kuala-lumpur', name: 'Kuala Lumpur', subreddit: 'malaysia', lat: 3.14,   lon: 101.69,  country: 'MY', index: 3,  flag: '🇲🇾' },
  { id: 'jakarta',    name: 'Jakarta',      subreddit: 'indonesia', lat: -6.21,   lon: 106.85,  country: 'ID', index: 0,  flag: '🇮🇩' },
  { id: 'karachi',    name: 'Karachi',      subreddit: 'karachi',   lat: 24.86,   lon: 67.01,   country: 'PK', index: 1,  flag: '🇵🇰' },
  { id: 'chennai',    name: 'Chennai',      subreddit: 'Chennai',   lat: 13.08,   lon: 80.27,   country: 'IN', index: 2,  flag: '🇮🇳' },

  // ── Americas ──────────────────────────────────────────────────────────────
  { id: 'los-angeles',  name: 'Los Angeles',  subreddit: 'LosAngeles', lat: 34.05,  lon: -118.24, country: 'US', index: 3,  flag: '🇺🇸' },
  { id: 'chicago',      name: 'Chicago',      subreddit: 'chicago',    lat: 41.88,  lon: -87.63,  country: 'US', index: 0,  flag: '🇺🇸' },
  { id: 'miami',        name: 'Miami',        subreddit: 'miami',      lat: 25.77,  lon: -80.19,  country: 'US', index: 1,  flag: '🇺🇸' },
  { id: 'seattle',      name: 'Seattle',      subreddit: 'Seattle',    lat: 47.61,  lon: -122.33, country: 'US', index: 2,  flag: '🇺🇸' },
  { id: 'mexico-city',  name: 'Mexico City',  subreddit: 'mexico',     lat: 19.43,  lon: -99.13,  country: 'MX', index: 3,  flag: '🇲🇽' },
  { id: 'buenos-aires', name: 'Buenos Aires', subreddit: 'buenosaires', lat: -34.60, lon: -58.38, country: 'AR', index: 0,  flag: '🇦🇷' },
  { id: 'bogota',       name: 'Bogotá',       subreddit: 'colombia',   lat: 4.71,   lon: -74.07,  country: 'CO', index: 1,  flag: '🇨🇴' },
  { id: 'lima',         name: 'Lima',         subreddit: 'peru',       lat: -12.05, lon: -77.04,  country: 'PE', index: 2,  flag: '🇵🇪' },

  // ── Africa & Middle East ──────────────────────────────────────────────────
  { id: 'cairo',        name: 'Cairo',        subreddit: 'egypt',       lat: 30.04,  lon: 31.24,   country: 'EG', index: 3,  flag: '🇪🇬' },
  { id: 'nairobi',      name: 'Nairobi',      subreddit: 'nairobi',     lat: -1.29,  lon: 36.82,   country: 'KE', index: 0,  flag: '🇰🇪' },
  { id: 'johannesburg', name: 'Johannesburg', subreddit: 'southafrica', lat: -26.20, lon: 28.04,   country: 'ZA', index: 1,  flag: '🇿🇦' },
  { id: 'riyadh',       name: 'Riyadh',       subreddit: 'saudiarabia', lat: 24.69,  lon: 46.72,   country: 'SA', index: 2,  flag: '🇸🇦' },
  { id: 'istanbul',     name: 'Istanbul',     subreddit: 'istanbul',    lat: 41.01,  lon: 28.97,   country: 'TR', index: 3,  flag: '🇹🇷' },

  // ── Oceania ───────────────────────────────────────────────────────────────
  { id: 'melbourne',    name: 'Melbourne',    subreddit: 'melbourne',   lat: -37.81, lon: 144.96,  country: 'AU', index: 0,  flag: '🇦🇺' },
  { id: 'auckland',     name: 'Auckland',     subreddit: 'newzealand',  lat: -36.86, lon: 174.77,  country: 'NZ', index: 1,  flag: '🇳🇿' },

  // ── India expansion ───────────────────────────────────────────────────────
  { id: 'delhi',        name: 'Delhi',        subreddit: 'delhi',       lat: 28.61,  lon: 77.21,   country: 'IN', index: 2,  flag: '🇮🇳' },
  { id: 'kolkata',      name: 'Kolkata',      subreddit: 'kolkata',     lat: 22.57,  lon: 88.36,   country: 'IN', index: 3,  flag: '🇮🇳' },
  { id: 'hyderabad',    name: 'Hyderabad',    subreddit: 'hyderabad',   lat: 17.39,  lon: 78.49,   country: 'IN', index: 0,  flag: '🇮🇳' },
  { id: 'pune',         name: 'Pune',         subreddit: 'pune',        lat: 18.52,  lon: 73.86,   country: 'IN', index: 1,  flag: '🇮🇳' },
]

// ── Continent groupings (city IDs) ────────────────────────────────────────────
export const CONTINENTS: Record<string, string[]> = {
  Africa:   ['lagos', 'cairo', 'nairobi', 'johannesburg'],
  Asia:     ['bangalore', 'mumbai', 'trivandrum', 'delhi', 'chennai', 'kolkata', 'hyderabad', 'pune',
             'tokyo', 'dubai', 'singapore', 'bangkok', 'seoul', 'beijing', 'shanghai', 'hong-kong',
             'kuala-lumpur', 'jakarta', 'karachi', 'riyadh'],
  Europe:   ['london', 'paris', 'berlin', 'amsterdam', 'madrid', 'rome', 'stockholm', 'vienna',
             'warsaw', 'brussels', 'zurich', 'istanbul'],
  Americas: ['new-york', 'toronto', 'sao-paulo', 'los-angeles', 'chicago', 'miami', 'seattle',
             'mexico-city', 'buenos-aires', 'bogota', 'lima'],
  Oceania:  ['sydney', 'melbourne', 'auckland'],
}

export const CONTINENT_CENTERS: Record<string, { lat: number; lon: number }> = {
  Africa:   { lat: 0,   lon: 20  },
  Asia:     { lat: 30,  lon: 90  },
  Europe:   { lat: 50,  lon: 15  },
  Americas: { lat: 10,  lon: -80 },
  Oceania:  { lat: -25, lon: 140 },
}
