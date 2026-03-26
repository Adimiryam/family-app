const OREF_HEADERS = {
  'Referer':          'https://www.oref.org.il/',
  'X-Requested-With': 'XMLHttpRequest',
  'Accept':           'application/json',
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const { from, to } = req.query
  if (!from || !to) return res.status(400).json({ error: 'חסרים פרמטרים from ו-to' })
  try {
    const url  = `https://alerts-history.oref.org.il/Shared/Ajax/GetAlarmsHistory.aspx?lang=he&fromDate=${from}&toDate=${to}&mode=0`
    const r    = await fetch(url, { headers: OREF_HEADERS })
    const data = await r.json()
    res.json(Array.isArray(data) ? data : [])
  } catch {
    res.json([])
  }
}
