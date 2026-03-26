/**
 * שירות פיקוד העורף — שולף ומעבד נתוני אזעקות אמיתיים
 */

import { alertLevelConfig } from '../data/familyData'

// ────────────────────────────────────────────────────────────
// עזרים
// ────────────────────────────────────────────────────────────

function calcLevel(alerts) {
  if (alerts === 0)  return 'low'
  if (alerts <= 3)   return 'low'
  if (alerts <= 10)  return 'medium'
  if (alerts <= 25)  return 'high'
  return 'critical'
}

function toOrefDate(date) {
  const d = date.getDate().toString().padStart(2, '0')
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const y = date.getFullYear()
  return `${d}.${m}.${y}`
}

function todayStr() {
  return new Date().toISOString().split('T')[0] // YYYY-MM-DD
}

function yesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

// ממיר תגובת פיקוד העורף למבנה { עיר: { alerts, shelterMinutes, level } }
function buildCityMap(rawList, filterDate = null) {
  const counts = {}

  for (const item of rawList) {
    if (!item.data) continue

    // תאריך הדיווח — מנסה שני פורמטים
    if (filterDate) {
      const dateStr = item.alertDate || item.AlertDate || ''
      // פורמט: "YYYY-MM-DD HH:MM:SS" או "DD/MM/YYYY HH:MM:SS"
      const normalized = dateStr.includes('-')
        ? dateStr.split(' ')[0]                          // YYYY-MM-DD
        : dateStr.split(' ')[0].split('/').reverse().join('-') // DD/MM/YYYY → YYYY-MM-DD
      if (normalized !== filterDate) continue
    }

    // רשימת ערים — מופרדת ב-", " או " ," או ";"
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

// ────────────────────────────────────────────────────────────
// API ציבורי
// ────────────────────────────────────────────────────────────

/** מחזיר אזעקה פעילה עכשיו, או null אם אין */
export async function fetchCurrentAlert() {
  try {
    const res = await fetch('/api/alerts/current')
    return await res.json()
  } catch {
    return null
  }
}

/** מחזיר נתוני עיר לפי תקופה: today / yesterday / week / sinceWar */
export async function fetchAlertsByPeriod(period, warStartDate = '28.02.2026') {
  try {
    if (period === 'today') {
      const today = toOrefDate(new Date())
      const res   = await fetch(`/api/alerts/range?from=${today}&to=${today}`)
      const list  = await res.json()
      return buildCityMap(list)
    }

    if (period === 'yesterday') {
      const d = new Date()
      d.setDate(d.getDate() - 1)
      const yest = toOrefDate(d)
      const res  = await fetch(`/api/alerts/range?from=${yest}&to=${yest}`)
      const list = await res.json()
      return buildCityMap(list)
    }

    if (period === 'week') {
      const to   = new Date()
      const from = new Date()
      from.setDate(from.getDate() - 6)
      const res  = await fetch(`/api/alerts/range?from=${toOrefDate(from)}&to=${toOrefDate(to)}`)
      const list = await res.json()
      return buildCityMap(list)         // ללא סינון תאריך = כל הטווח
    }

    if (period === 'sinceWar') {
      const to  = toOrefDate(new Date())
      const res = await fetch(`/api/alerts/range?from=${warStartDate}&to=${to}`)
      const list = await res.json()
      return buildCityMap(list)
    }

    return {}
  } catch (e) {
    console.warn('שגיאה בשליפת נתוני פיקוד העורף:', e.message)
    return null   // null = נחזור לנתונים מדומים
  }
}
