/**
 * שירות נתוני אזעקות — 5 שכבות fallback:
 * 1. GitHub raw (ענף alerts-data, מתעדכן ע"י GitHub Actions)
 * 2. Tzeva Adom API (נגיש מכל מקום, לא חסום גאוגרפית)
 * 3. CORS proxy → oref API (ישיר מהדפדפן — עובד מישראל)
 * 4. static cache (public/data/) כ-fallback
 * 5. localStorage cache (מהשליפה האחרונה שהצליחה)
 */

const GITHUB_RAW = 'https://raw.githubusercontent.com/Adimiryam/family-app/alerts-data/data'
const BASE = import.meta.env.BASE_URL

const TZEVA_ADOM_HISTORY = 'https://api.tzevaadom.co.il/alerts-history'

const OREF_HISTORY = 'https://www.oref.org.il/warningMessages/alert/History/AlertsHistory.json'
const OREF_CURRENT = 'https://www.oref.org.il/warningMessages/alert/Alerts.json'
const OREF_RANGE   = 'https://alerts-history.oref.org.il/Shared/Ajax/GetAlarmsHistory.aspx'

const CORS_PROXIES = [
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
]

const LS_PREFIX = 'familyapp_alerts_'

// ────────────────────────────────────────────────────────────
// עזרים
// ────────────────────────────────────────────────────────────

function calcLevel(n) {
  if (n <= 3)  return 'low'
  if (n <= 10) return 'medium'
  if (n <= 25) return 'high'
  return 'critical'
}

/**
 * Flatten nested tzevaadom format into flat alert items.
 * Input:  [{id, alerts: [{time, cities: ['a','b'], threat}]}]
 * Output: [{data: 'a, b', time, threat}]
 * Also handles already-flat items (oref format).
 */
function flattenAlerts(rawList) {
  const flat = []
  for (const item of rawList) {
    // Already flat — oref format with data string
    if (item.data && typeof item.data === 'string') {
      flat.push(item)
      continue
    }
    // Already flat — has cities array directly
    if (item.cities && Array.isArray(item.cities) && !item.alerts) {
      flat.push({ ...item, data: item.cities.join(', ') })
      continue
    }
    // Nested tzevaadom format — has alerts array with sub-items
    if (item.alerts && Array.isArray(item.alerts)) {
      for (const sub of item.alerts) {
        if (sub.cities && Array.isArray(sub.cities)) {
          flat.push({ data: sub.cities.join(', '), time: sub.time, threat: sub.threat })
        } else if (sub.data && typeof sub.data === 'string') {
          flat.push(sub)
        }
      }
      continue
    }
    // Fallback — try name field
    if (item.name) {
      flat.push({ ...item, data: item.name })
    }
  }
  return flat
}

export function buildCityMap(rawList) {
  // Flatten first in case we get nested tzevaadom data
  const items = flattenAlerts(rawList)
  const counts = {}
  for (const item of items) {
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

function fmtDate(d) {
  return [
    String(d.getDate()).padStart(2, '0'),
    String(d.getMonth() + 1).padStart(2, '0'),
    d.getFullYear(),
  ].join('.')
}

function getDateRange(period) {
  const now = new Date()
  if (period === 'yesterday') {
    const yd = new Date(now - 86400000)
    return { from: fmtDate(yd), to: fmtDate(yd) }
  }
  if (period === 'week') {
    return { from: fmtDate(new Date(now - 6 * 86400000)), to: fmtDate(now) }
  }
  if (period === 'sinceWar') {
    return { from: '28.02.2026', to: fmtDate(now) }
  }
  return null
}

// ────────────────────────────────────────────────────────────
// שליפות מרובות מקורות
// ────────────────────────────────────────────────────────────

// שליפה מ-GitHub raw (ענף alerts-data)
async function fetchGitHub(filename) {
  try {
    const ts = Date.now()
    const r = await fetch(`${GITHUB_RAW}/${filename}?t=${ts}`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) return null
    const data = await r.json()
    return Array.isArray(data) ? data : null
  } catch { return null }
}

// שליפה מ-Tzeva Adom API (נגיש גלובלית)
async function fetchTzevaAdom() {
  try {
    const r = await fetch(TZEVA_ADOM_HISTORY, {
      signal: AbortSignal.timeout(10000),
    })
    if (!r.ok) return null
    const data = await r.json()
    const items = Array.isArray(data) ? data : (data?.alerts || data?.data || null)
    if (!Array.isArray(items)) return null
    // Flatten nested format to flat oref-like items
    return flattenAlerts(items)
  } catch { return null }
}

// שליפה מקבצים סטטיים (public/data/)
async function fetchStatic(filename) {
  try {
    const r = await fetch(`${BASE}data/${filename}`, { cache: 'no-cache' })
    if (!r.ok) return null
    const data = await r.json()
    return Array.isArray(data) ? data : null
  } catch { return null }
}

// שליפה דרך CORS proxy
async function fetchProxy(url) {
  for (const proxy of CORS_PROXIES) {
    try {
      const r = await fetch(proxy(url), { signal: AbortSignal.timeout(10000) })
      if (!r.ok) continue
      const text = await r.text()
      if (!text || text === '""' || text === 'null' || text.length < 3) continue
      try {
        const data = JSON.parse(text)
        if (data) return data
      } catch { continue }
    } catch { continue }
  }
  return null
}

// שמירה/שליפה מ-localStorage
function saveToLS(period, rawList, source) {
  try {
    const entry = { data: rawList, source, savedAt: Date.now() }
    localStorage.setItem(LS_PREFIX + period, JSON.stringify(entry))
  } catch { /* localStorage full or unavailable */ }
}

function loadFromLS(period, maxAgeMs = 3600000) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + period)
    if (!raw) return null
    const entry = JSON.parse(raw)
    if (!entry?.data || !Array.isArray(entry.data)) return null
    if (Date.now() - (entry.savedAt || 0) > maxAgeMs) return null
    return entry
  } catch { return null }
}

// ────────────────────────────────────────────────────────────
// API ציבורי
// ────────────────────────────────────────────────────────────

/** אזעקה פעילה עכשיו, או null */
export async function fetchCurrentAlert() {
  // GitHub cache
  try {
    const ts = Date.now()
    const r = await fetch(`${GITHUB_RAW}/current.json?t=${ts}`, {
      signal: AbortSignal.timeout(5000),
    })
    if (r.ok) {
      const data = await r.json()
      if (data && data?.data?.length) return data
    }
  } catch { /* continue */ }

  // CORS proxy
  try {
    const data = await fetchProxy(OREF_CURRENT)
    if (data && data?.data?.length) return data
  } catch { /* continue */ }

  return null
}

/**
 * נתוני אזעקות לפי תקופה: today / yesterday / week / sinceWar
 * מחזיר { data: { [cityName]: { alerts, shelterMinutes, level } }, source }
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

  // ── שלב 1: GitHub raw (ענף alerts-data) ──────────────────
  const gh = await fetchGitHub(filename)
  if (gh !== null) {
    if (gh.length > 0) saveToLS(period, gh, 'github')
    return { data: gh.length > 0 ? buildCityMap(gh) : {}, source: 'github' }
  }

  // ── שלב 2: Tzeva Adom API (נגיש גלובלית) ────────────────
  if (period === 'today') {
    try {
      const tzevaData = await fetchTzevaAdom()
      if (tzevaData !== null) {
        if (tzevaData.length > 0) saveToLS(period, tzevaData, 'tzevaadom')
        return { data: tzevaData.length > 0 ? buildCityMap(tzevaData) : {}, source: 'tzevaadom' }
      }
    } catch { /* continue */ }
  }

  // ── שלב 3: CORS proxy לנתונים חיים מ-oref ────────────────
  try {
    let liveData = null

    if (period === 'today') {
      liveData = await fetchProxy(OREF_HISTORY)
    } else {
      const range = getDateRange(period)
      if (range) {
        const url = `${OREF_RANGE}?lang=he&fromDate=${range.from}&toDate=${range.to}&mode=0`
        liveData = await fetchProxy(url)
      }
    }

    if (Array.isArray(liveData)) {
      if (liveData.length > 0) saveToLS(period, liveData, 'live')
      return { data: liveData.length > 0 ? buildCityMap(liveData) : {}, source: 'live' }
    }
  } catch { /* continue */ }

  // ── שלב 4: static cache (public/data/) ───────────────────
  const staticData = await fetchStatic(filename)
  if (staticData !== null) {
    return { data: staticData.length > 0 ? buildCityMap(staticData) : {}, source: 'cache' }
  }

  // ── שלב 5: localStorage cache (עד 6 שעות) ────────────────
  const lsEntry = loadFromLS(period, 6 * 3600000)
  if (lsEntry && lsEntry.data.length > 0) {
    return { data: buildCityMap(lsEntry.data), source: 'cached-' + (lsEntry.source || 'local') }
  }

  // ── שלב 6: הכל נכשל ──────────────────────────────────────
  return { data: {}, source: 'unavailable' }
}
