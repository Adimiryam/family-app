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

export function normalizeCity(name) {
  if (!name) return ''
  return name.replace(/-/g, ' ').replace(/\s+/g, ' ').trim()
}

function calcLevel(n) {
  if (n <= 3)  return 'low'
  if (n <= 10) return 'medium'
  if (n <= 25) return 'high'
  return 'critical'
}

function shelterTimeForThreat(threat) {
  const t = Number(threat)
  if (t === 4) return 0
  if (t === 6) return 0
  return 10
}

function flattenAlerts(rawList) {
  const flat = []
  for (const item of rawList) {
    if (item.data && typeof item.data === 'string') { flat.push(item); continue }
    if (item.cities && Array.isArray(item.cities) && !item.alerts) { flat.push({ ...item, data: item.cities.join(', ') }); continue }
    if (item.alerts && Array.isArray(item.alerts)) {
      for (const sub of item.alerts) {
        if (sub.cities && Array.isArray(sub.cities)) flat.push({ data: sub.cities.join(', '), time: sub.time, threat: sub.threat })
        else if (sub.data && typeof sub.data === 'string') flat.push(sub)
      }
      continue
    }
    if (item.name) flat.push({ ...item, data: item.name })
  }
  return flat
}

// ── פרסור תאריך מאיטם אזעקה ──────────────────────────────
function parseAlertDate(item) {
  const s = item.time || item.alertDate || item.date || item.timestamp || ''
  if (!s) return null
  let d = new Date(s)
  if (!isNaN(d.getTime())) return d
  // dd.mm.yyyy format
  const m = String(s).match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  if (m) return new Date(+m[3], +m[2]-1, +m[1])
  return null
}

// ── סינון לפי טווח ימים ───────────────────────────────────
function filterByDays(items, days) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  cutoff.setHours(0, 0, 0, 0)
  return items.filter(item => {
    const d = parseAlertDate(item)
    if (!d) return true
    return d >= cutoff
  })
}

export function buildCityMap(rawList) {
  const items = flattenAlerts(rawList)
  const cityData = {}
  for (const item of items) {
    if (!item.data) continue
    if (item.isDrill) continue
    const cities = String(item.data).split(/,\s*|;\s*/)
    const shelterTime = shelterTimeForThreat(item.threat)
    for (const raw of cities) {
      const city = normalizeCity(raw)
      if (!city) continue
      if (!cityData[city]) cityData[city] = { alerts: 0, shelterMinutes: 0 }
      cityData[city].alerts += 1
      cityData[city].shelterMinutes += shelterTime
    }
  }
  const result = {}
  for (const [city, data] of Object.entries(cityData)) {
    result[city] = { ...data, level: calcLevel(data.alerts) }
  }
  return result
}

function fmtDate(d) {
  return [String(d.getDate()).padStart(2, '0'), String(d.getMonth() + 1).padStart(2, '0'), d.getFullYear()].join('.')
}

async function fetchGitHub(filename) {
  try {
    const ts = Date.now()
    const r = await fetch(`${GITHUB_RAW}/${filename}?t=${ts}`, { signal: AbortSignal.timeout(8000) })
    if (!r.ok) return null
    const data = await r.json()
    return Array.isArray(data) ? data : null
  } catch { return null }
}

async function fetchTzevaAdom() {
  try {
    const r = await fetch(TZEVA_ADOM_HISTORY, { signal: AbortSignal.timeout(10000) })
    if (!r.ok) return null
    const data = await r.json()
    const items = Array.isArray(data) ? data : (data?.alerts || data?.data || null)
    if (!Array.isArray(items)) return null
    return flattenAlerts(items)
  } catch { return null }
}

async function fetchStatic(filename) {
  try {
    const r = await fetch(`${BASE}data/${filename}`, { cache: 'no-cache' })
    if (!r.ok) return null
    const data = await r.json()
    return Array.isArray(data) ? data : null
  } catch { return null }
}

async function fetchProxy(url) {
  for (const proxy of CORS_PROXIES) {
    try {
      const r = await fetch(proxy(url), { signal: AbortSignal.timeout(10000) })
      if (!r.ok) continue
      const text = await r.text()
      if (!text || text === '""' || text === 'null' || text.length < 3) continue
      try { const data = JSON.parse(text); if (data) return data } catch { continue }
    } catch { continue }
  }
  return null
}

function saveToLS(period, rawList, source) {
  try {
    const entry = { data: rawList, source, savedAt: Date.now() }
    localStorage.setItem(LS_PREFIX + period, JSON.stringify(entry))
  } catch {}
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

export async function fetchMeta() {
  try {
    const ts = Date.now()
    const r = await fetch(`${GITHUB_RAW}/meta.json?t=${ts}`, { signal: AbortSignal.timeout(5000) })
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

export async function fetchCurrentAlert() {
  try {
    const ts = Date.now()
    const r = await fetch(`${GITHUB_RAW}/current.json?t=${ts}`, { signal: AbortSignal.timeout(5000) })
    if (r.ok) { const data = await r.json(); if (data && data?.data?.length) return data }
  } catch {}
  try { const data = await fetchProxy(OREF_CURRENT); if (data && data?.data?.length) return data } catch {}
  return null
}

// ── שליפת נתוני אזעקות גולמיים (ללא עיבוד) ───────────────
async function fetchRawAlerts(dataKey) {
  const filename = dataKey === 'today' ? 'today.json' : 'all.json'

  // שלב 1: GitHub raw
  const gh = await fetchGitHub(filename)
  if (gh !== null) {
    if (gh.length > 0) saveToLS(dataKey, gh, 'github')
    return { raw: gh, source: 'github' }
  }

  // שלב 2: Tzeva Adom API
  if (dataKey === 'today') {
    try {
      const tzevaData = await fetchTzevaAdom()
      if (tzevaData !== null) {
        if (tzevaData.length > 0) saveToLS(dataKey, tzevaData, 'tzevaadom')
        return { raw: tzevaData, source: 'tzevaadom' }
      }
    } catch {}
  }

  // שלב 3: CORS proxy
  if (dataKey === 'today') {
    try {
      const liveData = await fetchProxy(OREF_HISTORY)
      if (Array.isArray(liveData)) {
        if (liveData.length > 0) saveToLS(dataKey, liveData, 'live')
        return { raw: liveData, source: 'live' }
      }
    } catch {}
  }

  // שלב 4: static cache
  const staticData = await fetchStatic(filename)
  if (staticData !== null) return { raw: staticData, source: 'cache' }

  // שלב 5: localStorage
  const lsEntry = loadFromLS(dataKey, 6 * 3600000)
  if (lsEntry && lsEntry.data.length > 0) return { raw: lsEntry.data, source: 'cached-' + (lsEntry.source || 'local') }

  return { raw: [], source: 'unavailable' }
}

/**
 * נתוני אזעקות לפי תקופה: today / week / month / all
 * מחזיר { data: { [cityName]: { alerts, shelterMinutes, level } }, source }
 */
export async function fetchAlertsByPeriod(period) {
  // today שולף today.json, כל השאר שולפים all.json
  const dataKey = period === 'today' ? 'today' : 'all'
  const { raw, source } = await fetchRawAlerts(dataKey)

  if (raw.length === 0) return { data: {}, source }

  // סינון לפי טווח ימים
  let filtered = raw
  if (period === 'week') filtered = filterByDays(raw, 7)
  else if (period === 'month') filtered = filterByDays(raw, 30)
  // today ו-all לא מסוננים

  return { data: filtered.length > 0 ? buildCityMap(filtered) : {}, source }
}
