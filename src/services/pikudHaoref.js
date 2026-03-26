/**
 * שירות פיקוד העורף
 * אסטרטגיה כפולה:
 * 1. קודם קורא מקבצי JSON סטטיים (GitHub Actions cache)
 * 2. אם ריקים — שולף ישירות מ-oref.org.il מהדפדפן (עובד מישראל)
 */

const BASE = import.meta.env.BASE_URL  // '/family-app/' בפרודקשן, '/' בדב

const OREF_HEADERS = {
  'Referer':          'https://www.oref.org.il/',
  'X-Requested-With': 'XMLHttpRequest',
  'Accept':           'application/json',
}

// ────────────────────────────────────────────────────────────
// עזרים
// ────────────────────────────────────────────────────────────

function calcLevel(alerts) {
  if (alerts <= 0)   return 'low'
  if (alerts <= 3)   return 'low'
  if (alerts <= 10)  return 'medium'
  if (alerts <= 25)  return 'high'
  return 'critical'
}

function buildCityMap(rawList) {
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
    result[city] = {
      alerts,
      shelterMinutes: alerts * 3,
      level: calcLevel(alerts),
    }
  }
  return result
}

// קריאה מקבצים סטטיים (cache מ-GitHub Actions)
async function fetchStatic(filename) {
  try {
    const res = await fetch(`${BASE}data/${filename}`)
    if (!res.ok) return null
    const data = await res.json()
    return data
  } catch {
    return null
  }
}

// קריאה ישירה מ-oref (מהדפדפן — עובד מישראל בלי CORS בעיה עבור endpoint זה)
async function fetchDirectFromOref(url) {
  try {
    const res = await fetch(url, { headers: OREF_HEADERS })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// ────────────────────────────────────────────────────────────
// API ציבורי
// ────────────────────────────────────────────────────────────

/** מחזיר אזעקה פעילה עכשיו, או null אם אין */
export async function fetchCurrentAlert() {
  // נסה static קודם
  const cached = await fetchStatic('current.json')
  if (cached !== undefined) return cached

  // fallback: ישירות מ-oref
  try {
    const res = await fetch('https://www.oref.org.il/warningMessages/alert/Alerts.json', { headers: OREF_HEADERS })
    const text = (await res.text()).trim()
    if (!text || text === '""') return null
    const data = JSON.parse(text)
    return (!data || !data.data || data.data.length === 0) ? null : data
  } catch {
    return null
  }
}

/** מחזיר נתוני עיר לפי תקופה: today / yesterday / week / sinceWar */
export async function fetchAlertsByPeriod(period) {
  const fileMap = {
    today:     'today.json',
    yesterday: 'yesterday.json',
    week:      'week.json',
    sinceWar:  'sincewar.json',
  }

  const filename = fileMap[period]
  if (!filename) return {}

  // שלב 1: נסה static cache
  const cached = await fetchStatic(filename)
  if (Array.isArray(cached) && cached.length > 0) {
    return buildCityMap(cached)
  }

  // שלב 2: אם today ריק — נסה ישירות מ-oref (AlertsHistory.json = 24 שעות)
  if (period === 'today') {
    const live = await fetchDirectFromOref(
      'https://www.oref.org.il/warningMessages/alert/History/AlertsHistory.json'
    )
    if (Array.isArray(live) && live.length > 0) {
      return buildCityMap(live)
    }
  }

  // אם static ריק ואין live — החזר מפה ריקה (לא null כדי לא לגרום לסרבול UI)
  if (Array.isArray(cached)) return {}
  return null
}
