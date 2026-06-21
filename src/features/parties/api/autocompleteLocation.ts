import { createServerFn } from '@tanstack/react-start'

const API_KEY = process.env.GOOGLE_PLACES_API_KEY!
const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete'

export interface LocationSuggestion {
  text: string          // full string stored as party.location (passed to geocoder later)
  mainText: string      // e.g. "Flushing"
  secondaryText: string // e.g. "Queens, New York, NY, USA"
}

export const autocompleteLocation = createServerFn()
  .inputValidator((d: { input: string }) => d)
  .handler(async ({ data }) => {
    const { input } = data
    if (input.trim().length < 2) return [] as LocationSuggestion[]

    const res = await fetch(AUTOCOMPLETE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
      },
      body: JSON.stringify({
        input: input.trim(),
        languageCode: 'en',
        // No type restriction — lets users enter neighborhoods, boroughs,
        // cities, landmarks, or addresses. The geocoder handles all of them.
      }),
    })

    if (!res.ok) return [] as LocationSuggestion[]

    const json = await res.json() as {
      suggestions?: Array<{
        placePrediction?: {
          text?: { text?: string }
          structuredFormat?: {
            mainText?: { text?: string }
            secondaryText?: { text?: string }
          }
        }
      }>
    }

    return (json.suggestions ?? [])
      .map((s) => {
        const pred = s.placePrediction
        const mainText = pred?.structuredFormat?.mainText?.text ?? ''
        const secondaryText = pred?.structuredFormat?.secondaryText?.text ?? ''
        const text = pred?.text?.text ?? (mainText ? `${mainText}, ${secondaryText}` : '')
        return { text, mainText, secondaryText }
      })
      .filter((s): s is LocationSuggestion => s.text.length > 0)
      .slice(0, 5)
  })
