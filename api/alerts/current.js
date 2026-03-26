const OREF_HEADERS = {
  'Referer':          'https://www.oref.org.il/',
  'X-Requested-With': 'XMLHttpRequest',
  'Accept':           'application/json',
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    const r    = await fetch('https://www.oref.org.il/warningMessages/alert/Alerts.json', { headers: OREF_HEADERS })
    const text = (await r.text()).trim()
    if (!text || text === '""') return res.json(null)
    const data = JSON.parse(text)
    res.json(!data || !data.data || data.data.length === 0 ? null : data)
  } catch {
    res.json(null)
  }
}
