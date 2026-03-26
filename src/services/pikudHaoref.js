/**
 * שירות פיקוד העורף — 3 שכבות fallback:
 * 1. קבצי JSON סטטיים (GitHub Actions cache, מתעדכן כל 5 דקות)
 * 2. CORS proxy → oref API (עוקף CORS, עובד מהדפדפן)
 * 3. מחזיר {} ריק אם הכל נכשל (לא null — כדי לא להציג "מדומה")
 */

const BASE = import.meta.env.BASE_URL

const OREF_HISTORY_URL = 'https://www.oref.org.il/warningMessages/alert/History/AlertsHistory.json'
const OREF_CURRENT_URL = 'https://www.oref.org.il/warningMessages/alert/Alerts.json'

// CORS proxies לגישה ל-oref מהדפדפן
const CORS_PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
]

// ────────────────────────────────────────────────────────────
// עזרים
// ────────────────────────────────────────────────────────────

function calcLevel(alerts) {
  if (alerts <= 3)  return 'low'
  if (alerts <= 10) return 'medium'
  if (alerts <= 25) return 'high'
  return 'critical'
}

export function buildCityMap(rawList) {
  const counts = {}
  for (const item of rawList) {
    if (!item.data) continue
    const cities = String(item.data).split(/,\s*|;\s*/)
    for (const raw of cities) {
      const city = raw.trim()
      if (city) counts[city] = (counts[city] || 0) + 1
    }
  }
  const result = {}
  for (const [city, alerts] of Object.entries(counts)) {
    result[city] = { alerts, shelterMinutes: alerts * 3, level: calcLevel(alerts) }
  }
  return result
}

// קריאה מקבצים סטטיים (cache)
async function fetchStatic(filename) {
  try {
    const res = await fetch(`${BASE}data/${filename}`, { cache: 'no-cache' })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

// קריאה ישירה עם CORS proxy
async function fetchViaProxy(url) {
  for (const makeProxy of CORS_PROXIES) {
    try {
      const res = await fetch(makeProxy(url), { signal: AbortSignal.timeout(8000) })
      if (!res.ok) continue
      const data = await res.json()
      if (data) return data
    } catch { continue }
  }
  return null
}

// ────────────────────────────────────────────────────────────
// API ציבורי
// ────────────────────────────────────────────────────────────

/** מחזיר אזעקה פעילה עכשיו, או null אם אין */
export async function fetchCurrentAlert() {
  // static cache קודם
  const cached = await fetchStatic('current.json')
  if (cached !== undefined && cached !== null) return cached
  if (cached === null) return null // null = אין אזעקה (שמור בכוונה)

  // fallback: CORS proxy
  try {
    const data = await fetchViaProxy(OREF_CURRENT_URL)
    if (!data) return null
    const text = typeof data === 'string' ? data.trim() : JSON.stringify(data)
    if (!text || text === '""') return null
    const parsed = typeof data === 'string' ? JSON.parse(data) : data
    return (!parsed?.data?.length) ? null : parsed
  } catch { return null }
}

/**
 * מחזיר נתוני עיר לפי תקופה: today / yesterday / week / sinceWar
 * תמיד מחזיר אובייקט (לא null) — ריק = אין אזעקות, לא = שגיאה
 */
export async function fetchAlertsByPeriod(period) {
  const fileMap = {
    today:     'today.json',
    yesterday: 'yesterday.json',
    week:      'week.json',
    sinceWar:  'sincewar.json',
  }

  const filename = fileMap[period]
  if (!filename) return { data: {}, source: 'empty' }

  // שלב 1: static cache
  const cached = await fetchStatic(filename)
  if (Array.isArray(cached) && cached.length > 0) {
    return { data: buildCityMap(cached), source: 'cache' }
  }

  // שלב 2: today → נסה CORS proxy לקבלת נתוני 24 שעות אחרונות חיים
  if (period === 'today') {
    const live = await fetchViaProxy(OREF_HISTORY_URL)
    if (Array.isArray(live) && live.length > 0) {
      return { data: buildCityMap(live), source: 'live' }
    }
  }

  // שלב 3: החזר ריק — נתוני פיקוד העורף נטענו, פשוט אין אזעקות בתקופה זו
  return { data: {}, source: Array.isArray(cached) ? 'empty' : 'unavailable' }
}
