import { LOCALITIES_PART1 } from './israeliLocalities_1'
import { LOCALITIES_PART2 } from './israeliLocalities_2'

export const SPECIAL_BASE = { name: 'בסיס כלשהו', lat: 32.7048, lng: 35.0271 }
export const DEFAULT_LOCATION = { name: 'הכותל המערבי', lat: 31.7767, lng: 35.2345 }

export const LOCALITIES = [
  ...LOCALITIES_PART1,
  ...LOCALITIES_PART2,
]

export const localityCoords = Object.fromEntries(
  LOCALITIES.map(l => [l.name, { lat: l.lat, lng: l.lng }])
)
