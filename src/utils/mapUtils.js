import { LOCALITIES } from '../data/israeliLocalities'
import { WAR_START_DATE } from '../data/familyData'

export const LOCATIONS_KEY = 'familyapp_locations'
export const LOCALITIES_SORTED = [...LOCALITIES].sort((a, b) => a.name.localeCompare(b.name, 'he'))

export const PERIODS = [
  { key: 'today',    label: 'היום',              icon: '📅' },
  { key: 'yesterday',label: 'אתמול',             icon: '📅' },
  { key: 'week',     label: '7 ימים',            icon: '🗓️' },
  { key: 'sinceWar', label: `מ-${WAR_START_DATE}`, icon: '⚔️' },
]
export const levelColors = { low: '#16a34a', medium: '#d97706', high: '#dc2626', critical: '#7c0000' }
export const levelRadius = { low: 12, medium: 18, high: 24, critical: 32 }

// מדד בטחון לפי מספר אזעקות בעיר של המשתמש הנוכחי
export function calcSecurityLevel(userCityAlerts, dataLoaded) {
  if (!dataLoaded)            return { color: '#94a3b8', bg: '#f1f5f9', label: 'אין מידע', icon: '⚪' }
  if (userCityAlerts === 0)   return { color: '#16a34a', bg: '#dcfce7', label: 'בטוח',     icon: '🟢' }
  if (userCityAlerts <= 2)    return { color: '#d97706', bg: '#fef3c7', label: 'זהירות',   icon: '🟡' }
  return                             { color: '#dc2626', bg: '#fee2e2', label: 'מוגבר',    icon: '🔴' }
}

export function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// ────────────────────────────────────────────────────────────
// המרת מספר לגימטריה עברית
// ────────────────────────────────────────────────────────────
export function numberToGematria(num) {
  if (num <= 0) return ''
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט']
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ']
  const hundreds = ['', 'ק', 'ר', 'ש', 'ת']

  let result = ''

  // מאות (עד 400=ת, אחרי זה תק=500, תר=600 וכו')
  let h = Math.floor(num / 100)
  let remainder = num % 100

  while (h > 4) {
    result += 'ת'
    h -= 4
  }
  if (h > 0) result += hundreds[h]

  // מקרים מיוחדים: 15 ו-16
  if (remainder === 15) {
    result += 'טו'
  } else if (remainder === 16) {
    result += 'טז'
  } else {
    const t = Math.floor(remainder / 10)
    const o = remainder % 10
    if (t > 0) result += tens[t]
    if (o > 0) result += ones[o]
  }

  // הוספת גרש/גרשיים
  if (result.length === 1) {
    result += '׳'
  } else if (result.length > 1) {
    result = result.slice(0, -1) + '״' + result.slice(-1)
  }

  return result
}

// ────────────────────────────────────────────────────────────
// תאריך עברי עם אותיות
// ────────────────────────────────────────────────────────────
export function getHebrewDateParts(date) {
  try {
    const fmt = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', {
      year: 'numeric', month: 'long', day: 'numeric'
    })
    const parts = fmt.formatToParts(date)
    let day = '', month = '', year = ''
    for (const p of parts) {
      if (p.type === 'day') day = p.value
      if (p.type === 'month') month = p.value
      if (p.type === 'year') year = p.value
    }
    return { dayNum: parseInt(day) || 0, month: month.trim(), yearNum: parseInt(year) || 0 }
  } catch { return { dayNum: 0, month: '', yearNum: 0 } }
}

export function formatHebrewDate(date) {
  const { dayNum, month, yearNum } = getHebrewDateParts(date)
  if (!dayNum || !month) return ''
  const dayHeb = numberToGematria(dayNum)
  const yearHeb = numberToGematria(yearNum % 1000)
  return `${dayHeb} ${month} ${yearHeb}`
}
