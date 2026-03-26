/**
 * שירות פיקוד העורף — קורא מקבצי JSON סטטיים שמתעדכנים דרך GitHub Actions
 */

import { alertLevelConfig } from '../data/familyData'

const BASE = import.meta.env.BASE_URL  // '/family-app/' בפרודקשן, '/' בדב

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

async function fetchStatic(filename) {
  try {
    const res = await fetch(`${BASE}data/${filename}`)
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
  return await fetchStatic('current.json')
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

  const list = await fetchStatic(filename)
  if (!list) return null
  return buildCityMap(list)
}
