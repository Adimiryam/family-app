export const SPECIAL_BASE = { name: 'בסיס כלשהו', lat: 32.7048, lng: 35.0271 }
export const DEFAULT_LOCATION = { name: 'הכותל המערבי', lat: 31.7767, lng: 35.2345 }

export const LOCALITIES = [
  { name: 'באר שבע - דרום', lat: 31.24145, lng: 34.77619 },
  { name: 'ירושלים - מרכז', lat: 31.77814, lng: 35.21661 },
  { name: 'תל אביב - מרכז העיר', lat: 32.07988, lng: 34.78162 },
  { name: 'חיפה - כרמל, הדר ועיר תחתית', lat: 32.80682, lng: 34.98813 },
  { name: 'פסגות', lat: 31.89841, lng: 35.22606 },
  { name: 'סוסיא', lat: 31.39297, lng: 35.01516 },
  { name: 'TEST_DEPLOY_CHECK', lat: 31.5, lng: 34.9 },
]

export const localityCoords = Object.fromEntries(
  LOCALITIES.map(l => [l.name, { lat: l.lat, lng: l.lng }])
)
