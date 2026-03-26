/**
 * שרת פרוקסי — מתווך בין האפליקציה לפיקוד העורף
 * פיקוד העורף חוסם קריאות ישירות מהדפדפן, אז השרת הזה שואל עבורנו
 */

import express from 'express'
import cors from 'cors'

const app  = express()
const PORT = 3001

app.use(cors())

// כותרות שפיקוד העורף דורש
const OREF_HEADERS = {
  'Referer':          'https://www.oref.org.il/',
  'X-Requested-With': 'XMLHttpRequest',
  'Accept':           'application/json',
}

// ── אזעקות פעילות עכשיו (מתרענן כל 10 שניות בצד הלקוח) ─────
app.get('/api/alerts/current', async (req, res) => {
  try {
    const r    = await fetch('https://www.oref.org.il/warningMessages/alert/Alerts.json', { headers: OREF_HEADERS })
    const text = (await r.text()).trim()
    if (!text || text === '""') return res.json(null)
    const data = JSON.parse(text)
    res.json(!data || !data.data || data.data.length === 0 ? null : data)
  } catch (e) {
    console.error('שגיאה באזעקות נוכחיות:', e.message)
    res.json(null)
  }
})

// ── היסטוריה — 24 שעות אחרונות ──────────────────────────────
app.get('/api/alerts/history', async (req, res) => {
  try {
    const r    = await fetch('https://www.oref.org.il/warningMessages/alert/History/AlertsHistory.json', { headers: OREF_HEADERS })
    const data = await r.json()
    res.json(Array.isArray(data) ? data : [])
  } catch (e) {
    console.error('שגיאה בהיסטוריה:', e.message)
    res.json([])
  }
})

// ── היסטוריה לפי טווח תאריכים (DD.MM.YYYY) ──────────────────
// לדוגמה: /api/alerts/range?from=01.03.2026&to=25.03.2026
app.get('/api/alerts/range', async (req, res) => {
  const { from, to } = req.query
  if (!from || !to) return res.status(400).json({ error: 'חסרים פרמטרים from ו-to' })
  try {
    const url  = `https://alerts-history.oref.org.il/Shared/Ajax/GetAlarmsHistory.aspx?lang=he&fromDate=${from}&toDate=${to}&mode=0`
    const r    = await fetch(url, { headers: OREF_HEADERS })
    const data = await r.json()
    res.json(Array.isArray(data) ? data : [])
  } catch (e) {
    console.error('שגיאה בטווח תאריכים:', e.message)
    res.json([])
  }
})

app.listen(PORT, () => {
  console.log(`✅ שרת פרוקסי רץ על http://localhost:${PORT}`)
  console.log('   מוכן לשאול את פיקוד העורף...')
})
