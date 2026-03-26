/**
 * שולף נתוני אזעקות מפיקוד העורף ושומר כקבצי JSON סטטיים
 * רץ דרך GitHub Actions כל 5 דקות
 */
import { writeFileSync, mkdirSync } from 'fs'

const HEADERS = {
  'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Referer':          'https://www.oref.org.il/',
  'X-Requested-With': 'XMLHttpRequest',
  'Accept':           'application/json, text/javascript, */*; q=0.01',
  'Accept-Language':  'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
}

function toOrefDate(date) {
  const d = date.getDate().toString().padStart(2, '0')
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  return `${d}.${m}.${date.getFullYear()}`
}

async function fetchSafe(url) {
  try {
    const r = await fetch(url, { headers: HEADERS })
    return await r.json()
  } catch {
    return null
  }
}

mkdirSync('data', { recursive: true })

// ── אזעקה פעילה עכשיו ────────────────────────────────────
try {
  const r    = await fetch('https://www.oref.org.il/warningMessages/alert/Alerts.json', { headers: HEADERS })
  const text = (await r.text()).trim()
  if (!text || text === '""') {
    writeFileSync('data/current.json', 'null')
  } else {
    const data = JSON.parse(text)
    writeFileSync('data/current.json', JSON.stringify(
      (!data || !data.data || data.data.length === 0) ? null : data
    ))
  }
} catch {
  writeFileSync('data/current.json', 'null')
}

const today = toOrefDate(new Date())
const yd    = new Date(); yd.setDate(yd.getDate() - 1)
const week  = new Date(); week.setDate(week.getDate() - 6)

// ── היום ────────────────────────────────────────────────
const todayData = await fetchSafe(
  `https://alerts-history.oref.org.il/Shared/Ajax/GetAlarmsHistory.aspx?lang=he&fromDate=${today}&toDate=${today}&mode=0`
)
writeFileSync('data/today.json', JSON.stringify(Array.isArray(todayData) ? todayData : []))

// ── אתמול ────────────────────────────────────────────────
const yesterdayData = await fetchSafe(
  `https://alerts-history.oref.org.il/Shared/Ajax/GetAlarmsHistory.aspx?lang=he&fromDate=${toOrefDate(yd)}&toDate=${toOrefDate(yd)}&mode=0`
)
writeFileSync('data/yesterday.json', JSON.stringify(Array.isArray(yesterdayData) ? yesterdayData : []))

// ── שבוע ────────────────────────────────────────────────
const weekData = await fetchSafe(
  `https://alerts-history.oref.org.il/Shared/Ajax/GetAlarmsHistory.aspx?lang=he&fromDate=${toOrefDate(week)}&toDate=${today}&mode=0`
)
writeFileSync('data/week.json', JSON.stringify(Array.isArray(weekData) ? weekData : []))

// ── מאז המלחמה ──────────────────────────────────────────
const sinceWarData = await fetchSafe(
  `https://alerts-history.oref.org.il/Shared/Ajax/GetAlarmsHistory.aspx?lang=he&fromDate=28.02.2026&toDate=${today}&mode=0`
)
writeFileSync('data/sincewar.json', JSON.stringify(Array.isArray(sinceWarData) ? sinceWarData : []))

console.log('✅ נתוני אזעקות עודכנו בהצלחה —', new Date().toISOString())
