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
  lat: number | null
  lng: number | null
  servesVegetarianFood?: boolean
  // Restaurant's own site — where reservations live. Optional because
  // recommendations saved before this field existed won't have it.
  website?: string | null
}

export const CUISINE_TO_GOOGLE_TYPE: Record<string, string> = {
  'Afghani': 'afghani_restaurant',
  'African': 'african_restaurant',
  'American': 'american_restaurant',
  'Argentinian': 'argentinian_restaurant',
  'Australian': 'australian_restaurant',
  'Austrian': 'austrian_restaurant',
  'Bangladeshi': 'bangladeshi_restaurant',
  'Basque': 'basque_restaurant',
  'Bavarian': 'bavarian_restaurant',
  'BBQ': 'barbecue_restaurant',
  'Belgian': 'belgian_restaurant',
  'Brazilian': 'brazilian_restaurant',
  'Breakfast & Brunch': 'breakfast_restaurant',
  'British': 'british_restaurant',
  'Burgers': 'hamburger_restaurant',
  'Burmese': 'burmese_restaurant',
  'Cajun & Southern': 'cajun_restaurant',
  'Californian': 'californian_restaurant',
  'Cambodian': 'cambodian_restaurant',
  'Cantonese': 'cantonese_restaurant',
  'Caribbean': 'caribbean_restaurant',
  'Chilean': 'chilean_restaurant',
  'Chinese': 'chinese_restaurant',
  'Chinese Noodles': 'chinese_noodle_restaurant',
  'Colombian': 'colombian_restaurant',
  'Croatian': 'croatian_restaurant',
  'Cuban': 'cuban_restaurant',
  'Czech': 'czech_restaurant',
  'Danish': 'danish_restaurant',
  'Dim Sum': 'dim_sum_restaurant',
  'Dutch': 'dutch_restaurant',
  'Eastern European': 'eastern_european_restaurant',
  'Ethiopian': 'ethiopian_restaurant',
  'Filipino': 'filipino_restaurant',
  'French': 'french_restaurant',
  'German': 'german_restaurant',
  'Greek': 'greek_restaurant',
  'Hawaiian': 'hawaiian_restaurant',
  'Hot Pot': 'hot_pot_restaurant',
  'Hungarian': 'hungarian_restaurant',
  'Indian': 'indian_restaurant',
  'Indonesian': 'indonesian_restaurant',
  'Irish': 'irish_restaurant',
  'Israeli': 'israeli_restaurant',
  'Italian': 'italian_restaurant',
  'Japanese': 'japanese_restaurant',
  'Japanese Curry': 'japanese_curry_restaurant',
  'Japanese Izakaya': 'japanese_izakaya_restaurant',
  'Korean': 'korean_restaurant',
  'Korean BBQ': 'korean_barbecue_restaurant',
  'Latin American': 'latin_american_restaurant',
  'Lebanese': 'lebanese_restaurant',
  'Malaysian': 'malaysian_restaurant',
  'Mediterranean': 'mediterranean_restaurant',
  'Mexican': 'mexican_restaurant',
  'Middle Eastern': 'middle_eastern_restaurant',
  'Mongolian BBQ': 'mongolian_barbecue_restaurant',
  'Moroccan': 'moroccan_restaurant',
  'North Indian': 'north_indian_restaurant',
  'Pakistani': 'pakistani_restaurant',
  'Persian': 'persian_restaurant',
  'Peruvian': 'peruvian_restaurant',
  'Pizza': 'pizza_restaurant',
  'Polish': 'polish_restaurant',
  'Portuguese': 'portuguese_restaurant',
  'Ramen': 'ramen_restaurant',
  'Romanian': 'romanian_restaurant',
  'Russian': 'russian_restaurant',
  'Sandwiches & Deli': 'sandwich_shop',
  'Scandinavian': 'scandinavian_restaurant',
  'Seafood': 'seafood_restaurant',
  'Soul Food': 'soul_food_restaurant',
  'South American': 'south_american_restaurant',
  'South Indian': 'south_indian_restaurant',
  'Southwestern': 'southwestern_us_restaurant',
  'Spanish': 'spanish_restaurant',
  'Sri Lankan': 'sri_lankan_restaurant',
  'Steakhouse': 'steak_house',
  'Sushi': 'sushi_restaurant',
  'Swiss': 'swiss_restaurant',
  'Taiwanese': 'taiwanese_restaurant',
  'Tapas': 'tapas_restaurant',
  'Tex-Mex': 'tex_mex_restaurant',
  'Thai': 'thai_restaurant',
  'Tibetan': 'tibetan_restaurant',
  'Tonkatsu': 'tonkatsu_restaurant',
  'Turkish': 'turkish_restaurant',
  'Ukrainian': 'ukrainian_restaurant',
  'Vegan': 'vegan_restaurant',
  'Vegetarian': 'vegetarian_restaurant',
  'Vietnamese': 'vietnamese_restaurant',
  'Yakiniku': 'yakiniku_restaurant',
  'Yakitori': 'yakitori_restaurant',
}

const EXCLUDED_TYPES = [
  'casino',
  'amusement_park',
  'movie_theater',
  'bowling_alley',
  'stadium',
  'zoo',
]

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
        'places.location',
        'places.servesVegetarianFood',
        // websiteUri bumps this request into Google's Enterprise pricing tier
        // (slightly costlier per call) — it's what powers the reserve button
        'places.websiteUri',
      ].join(','),
    },
    // priceLevels is included as a hint but the API often ignores it; we filter client-side below
    body: JSON.stringify({
      includedTypes,
      excludedTypes: EXCLUDED_TYPES,
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
      location?: { latitude: number; longitude: number }
      servesVegetarianFood?: boolean
      websiteUri?: string
    }>
  }

  const validPriceLevels = new Set(priceLevels)

  return (data.places ?? [])
    .filter((p) => {
      const level = p.priceLevel ?? 'PRICE_LEVEL_UNSPECIFIED'
      // Unknown price = keep (no data to filter on)
      if (level === 'PRICE_LEVEL_UNSPECIFIED') return true
      return validPriceLevels.has(level)
    })
    .map((p) => ({
      id: p.id,
      name: p.displayName.text,
      rating: p.rating ?? 0,
      reviewCount: p.userRatingCount ?? 0,
      priceLevel: p.priceLevel ?? 'PRICE_LEVEL_UNSPECIFIED',
      types: p.types ?? [],
      address: p.shortFormattedAddress ?? '',
      photoName: p.photos?.[0]?.name ?? null,
      photoUrl: null,
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null,
      servesVegetarianFood: p.servesVegetarianFood,
      website: p.websiteUri ?? null,
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
