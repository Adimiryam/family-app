const OREF_HEADERS = {
  'Referer':          'https://www.oref.org.il/',
  'X-Requested-With': 'XMLHttpRequest',
  'Accept':           'application/json',
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    const r    = await fetch('https://www.oref.org.il/warningMessages/alert/History/AlertsHistory.json', { headers: OREF_HEADERS })
    const data = await r.json()
    res.json(Array.isArray(data) ? data : [])
  } catch {
    res.json([])
  }
}
