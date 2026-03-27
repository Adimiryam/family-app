// רשימת כל היישובים בישראל — מבוסס על נתוני פיקוד העורף
// מקור: pikud-haoref-api (~1,450 ישובים)
// מחולק ל-4 קבצים לאמינות: א-ג, ג-כ, כ-ע, ע-ת
import { LOCALITIES_PART1 } from './israeliLocalities_1'
import { LOCALITIES_PART2 } from './israeliLocalities_2'
import { LOCALITIES_PART3 } from './israeliLocalities_3'
import { LOCALITIES_PART4 } from './israeliLocalities_4'

// אפשרות מיוחדת — תמיד בראש הרשימה
export const SPECIAL_BASE = { name: 'בסיס כלשהו', lat: 32.7048, lng: 35.0271 }

// מיקום ברירת מחדל — הכותל המערבי, ירושלים
export const DEFAULT_LOCATION = { name: 'הכותל המערבי', lat: 31.7767, lng: 35.2345 }

// איחוד כל 4 החלקים למערך אחד
export const LOCALITIES = [
  ...LOCALITIES_PART1,
  ...LOCALITIES_PART2,
  ...LOCALITIES_PART3,
  ...LOCALITIES_PART4,
]

export const localityCoords = Object.fromEntries(
  LOCALITIES.map(l => [l.name, { lat: l.lat, lng: l.lng }])
)
