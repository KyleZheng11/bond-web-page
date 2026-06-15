const API_KEY = process.env.GOOGLE_PLACES_API_KEY!
const NEARBY_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchNearby'
const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json'

export interface Place {
  id: string
  name: string
  rating: number
  reviewCount: number
  priceLevel: string
  types: string[]
  address: string
  photoName: string | null
  photoUrl: string | null
}

export const CUISINE_TO_GOOGLE_TYPE: Record<string, string> = {
  'American': 'american_restaurant',
  'BBQ': 'barbecue_restaurant',
  'Burgers': 'hamburger_restaurant',
  'Chinese': 'chinese_restaurant',
  'French': 'french_restaurant',
  'Greek': 'greek_restaurant',
  'Indian': 'indian_restaurant',
  'Italian': 'italian_restaurant',
  'Japanese': 'japanese_restaurant',
  'Korean': 'korean_restaurant',
  'Lebanese': 'lebanese_restaurant',
  'Mediterranean': 'mediterranean_restaurant',
  'Mexican': 'mexican_restaurant',
  'Middle Eastern': 'middle_eastern_restaurant',
  'Pizza': 'pizza_restaurant',
  'Seafood': 'seafood_restaurant',
  'Spanish': 'spanish_restaurant',
  'Steakhouse': 'steak_house',
  'Sushi': 'sushi_restaurant',
  'Thai': 'thai_restaurant',
  'Turkish': 'turkish_restaurant',
  'Vietnamese': 'vietnamese_restaurant',
  'Sandwiches & Deli': 'sandwich_shop',
  // Caribbean, Cajun & Southern, Ethiopian, Latin American, Peruvian
  // have no direct Google Place type — they fall through to the broad 'restaurant' search
}

const TIER_TO_PRICE_LEVEL: Record<number, string> = {
  1: 'PRICE_LEVEL_INEXPENSIVE',
  2: 'PRICE_LEVEL_MODERATE',
  3: 'PRICE_LEVEL_EXPENSIVE',
  4: 'PRICE_LEVEL_VERY_EXPENSIVE',
}

export function tiersToGooglePriceLevels(ceilingTier: number): string[] {
  return Array.from({ length: ceilingTier }, (_, i) => TIER_TO_PRICE_LEVEL[i + 1])
}

export async function geocodeLocation(location: string): Promise<{ lat: number; lng: number }> {
  const url = `${GEOCODE_URL}?address=${encodeURIComponent(location)}&key=${API_KEY}`
  const res = await fetch(url)
  const data = await res.json() as {
    status: string
    results: Array<{ geometry: { location: { lat: number; lng: number } } }>
  }
  if (data.status !== 'OK' || !data.results[0]) {
    throw new Error(`Couldn't find location: ${location}`)
  }
  return data.results[0].geometry.location
}

export async function searchNearbyRestaurants(params: {
  lat: number
  lng: number
  radiusMeters?: number
  priceLevels: string[]
  includedTypes?: string[]
}): Promise<Place[]> {
  const { lat, lng, radiusMeters = 5000, priceLevels, includedTypes = ['restaurant'] } = params

  const res = await fetch(NEARBY_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.rating',
        'places.userRatingCount',
        'places.priceLevel',
        'places.types',
        'places.shortFormattedAddress',
        'places.photos',
      ].join(','),
    },
    body: JSON.stringify({
      includedTypes,
      maxResultCount: 20,
      locationRestriction: {
        circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters },
      },
      priceLevels,
    }),
  })

  const data = await res.json() as {
    places?: Array<{
      id: string
      displayName: { text: string }
      rating?: number
      userRatingCount?: number
      priceLevel?: string
      types?: string[]
      shortFormattedAddress?: string
      photos?: Array<{ name: string }>
    }>
  }

  return (data.places ?? []).map((p) => ({
    id: p.id,
    name: p.displayName.text,
    rating: p.rating ?? 0,
    reviewCount: p.userRatingCount ?? 0,
    priceLevel: p.priceLevel ?? 'PRICE_LEVEL_UNSPECIFIED',
    types: p.types ?? [],
    address: p.shortFormattedAddress ?? '',
    photoName: p.photos?.[0]?.name ?? null,
    photoUrl: null,
  }))
}

export async function resolvePhotoUrl(photoName: string): Promise<string | null> {
  try {
    const url = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=800&maxWidthPx=1200&key=${API_KEY}`
    const res = await fetch(url, { redirect: 'manual' })
    return res.headers.get('location')
  } catch {
    return null
  }
}
