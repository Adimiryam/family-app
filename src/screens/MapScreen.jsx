import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet'
import { useUser } from '../App'
import { familyMembers, grandchildren, alertLevelConfig, WAR_START_DATE } from '../data/familyData'
import { LOCALITIES, localityCoords, SPECIAL_BASE, DEFAULT_LOCATION } from '../data/israeliLocalities'
import { getStatus } from '../data/statusConfig'
import { fetchCurrentAlert, fetchAlertsByPeriod } from '../services/pikudHaoref'

const LOCATIONS_KEY = 'familyapp_locations'
const LOCALITIES_SORTED = [...LOCALITIES].sort((a, b) => a.name.localeCompare(b.name, 'he'))

const PERIODS = [
  { key: 'today',    label: 'היום',              icon: '📅' },
  { key: 'yesterday',label: 'אתמול',             icon: '📅' },
  { key: 'week',     label: '7 ימים',            icon: '🗓️' },
  { key: 'sinceWar', label: `מ-${WAR_START_DATE}`, icon: '⚔️' },
]
const levelColors = { low: '#16a34a', medium: '#d97706', high: '#dc2626', critical: '#7c0000' }
const levelRadius = { low: 12, medium: 18, high: 24, critical: 32 }

function calcSecurityLevel(todayAlertData, dataLoaded) {
  if (!dataLoaded) return { color: '#94a3b8', bg: '#f1f5f9', label: 'אין מידע', icon: '⚪' }
  const citiesWithAlerts = Object.values(todayAlertData).filter(d => d.alerts > 0).length
  if (citiesWithAlerts === 0) return { color: '#16a34a', bg: '#dcfce7', label: 'בטוח',  icon: '🟢' }
  if (citiesWithAlerts <= 5)  return { color: '#d97706', bg: '#fef3c7', label: 'זהירות', icon: '🟡' }
  return                             { color: '#dc2626', bg: '#fee2e2', label: 'מוגבר',  icon: '🔴' }
}

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// ────────────────────────────────────────────────────────────
// בורר מיקום inline
// ────────────────────────────────────────────────────────────
function InlineLocationPicker({ person, currentCity, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const inputRef = useRef()
  const containerRef = useRef()

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80)
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const filtered = search.trim()
    ? LOCALITIES_SORTED.filter(l => l.name.includes(search.trim()))
    : LOCALITIES_SORTED

  const handleSelect = (cityName) => {
    const coords = cityName === SPECIAL_BASE.name
      ? { lat: SPECIAL_BASE.lat, lng: SPECIAL_BASE.lng }
      : (localityCoords[cityName] || { lat: 31.5, lng: 34.9 })
    onSelect(person.id, { city: cityName, lat: coords.lat, lng: coords.lng, updatedAt: new Date().toISOString() })
  }

  return (
    <div ref={containerRef} style={{ marginTop: 8, borderRadius: 12, background: '#f8fafc', border: '1.5px solid #3b82f6', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderBottom: '1px solid #e2e8f0', background: 'white' }}>
        <span style={{ fontSize: 13 }}>🔍</span>
        <input
          ref={inputRef}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="חפש ישוב..."
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: '#1e293b', background: 'transparent', direction: 'rtl' }}
        />
        <button onClick={onClose} style={{ fontSize: 16, color: '#94a3b8', background: 'none', padding: '0 2px', border: 'none', cursor: 'pointer' }}>✕</button>
      </div>
      {/* כפתור בסיס כלשהו בולט — תמיד מוצג */}
      {(!search || SPECIAL_BASE.name.includes(search)) && (
        <button onClick={() => handleSelect(SPECIAL_BASE.name)} style={{
          width: '100%', textAlign: 'right', padding: '10px 14px',
          background: currentCity === SPECIAL_BASE.name ? '#15803d' : '#dcfce7',
          color: currentCity === SPECIAL_BASE.name ? 'white' : '#15803d',
          fontSize: 14, fontWeight: 700,
          borderBottom: '2px solid #86efac',
          display: 'flex', alignItems: 'center', gap: 8,
          border: 'none', borderBottom: '2px solid #86efac', cursor: 'pointer',
        }}>
          {currentCity === SPECIAL_BASE.name && <span>✓</span>}
          <span>🪖 {SPECIAL_BASE.name}</span>
          <span style={{ fontSize: 11, opacity: 0.7, marginRight: 'auto' }}>(יופיע ליד יערות הכרמל)</span>
        </button>
      )}
      <div style={{ maxHeight: 180, overflowY: 'auto' }}>
        {filtered.map(loc => (
          <button key={loc.name} onClick={() => handleSelect(loc.name)} style={{
            width: '100%', textAlign: 'right', padding: '9px 12px',
            background: currentCity === loc.name ? '#eff6ff' : 'transparent',
            color: currentCity === loc.name ? '#1e40af' : '#475569',
            fontSize: 13, fontWeight: currentCity === loc.name ? 700 : 400,
            borderBottom: '1px solid #f1f5f9',
            display: 'flex', alignItems: 'center', gap: 6,
            border: 'none', cursor: 'pointer',
          }}>
            {currentCity === loc.name && <span style={{ color: '#3b82f6' }}>✓</span>}
            <span>📍 {loc.name}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: '14px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>לא נמצאו תוצאות</div>
        )}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// מודל עריכת מיקומים
// ────────────────────────────────────────────────────────────
function EditLocationsModal({ allPeople, locations, onSave, onClose, cityAlertData }) {
  const [draft, setDraft]       = useState({ ...locations })
  const [tab, setTab]           = useState('adults')
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch]     = useState('')

  const adults      = allPeople.filter(p => !p.isGrandchild)
  const kiddos      = allPeople.filter(p => p.isGrandchild)
  const displayList = tab === 'adults' ? adults : kiddos
  const editingPerson = editingId ? allPeople.find(p => p.id === editingId) : null

  const handleChange = (person, city) => {
    const coords = city === SPECIAL_BASE.name
      ? { lat: SPECIAL_BASE.lat, lng: SPECIAL_BASE.lng }
      : (localityCoords[city] || { lat: person.lat, lng: person.lng })
    setDraft(d => ({ ...d, [person.id]: { city, lat: coords.lat, lng: coords.lng, updatedAt: new Date().toISOString() } }))
    setSearch('')
    setEditingId(null)
  }

  const filtered = search
    ? LOCALITIES_SORTED.filter(l => l.name.includes(search))
    : LOCALITIES_SORTED

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, margin: '0 auto', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>

        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1e293b' }}>📍 ערוך מיקומים</h2>
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>לחץ/י על שם כדי לערוך</p>
          </div>
          <button onClick={onClose} style={{ fontSize: 22, background: 'none', color: '#94a3b8', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 16px', flexShrink: 0 }}>
          {[['adults','👨‍👩‍👧 מבוגרים'],['kids','🧒 נכדים']].map(([k,l]) => (
            <button key={k} onClick={() => { setTab(k); setEditingId(null) }} style={{
              padding: '10px 14px', background: 'none',
              borderBottom: tab === k ? '2px solid #1e40af' : '2px solid transparent',
              color: tab === k ? '#1e40af' : '#64748b', fontSize: 13,
              fontWeight: tab === k ? 700 : 400, marginBottom: -1,
              border: 'none', cursor: 'pointer',
            }}>{l}</button>
          ))}
        </div>

        {editingPerson ? (
          <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#f8fafc', borderRadius: 10 }}>
              <span style={{ fontSize: 24 }}>{editingPerson.emoji}</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>{editingPerson.name}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  {draft[editingPerson.id]?.city ? `📍 ${draft[editingPerson.id].city}` : 'מיקום לא הוגדר'}
                </div>
              </div>
              <button onClick={() => { setEditingId(null); setSearch('') }} style={{
                marginRight: 'auto', background: '#f1f5f9', border: 'none',
                borderRadius: 8, padding: '6px 12px', fontSize: 12,
                color: '#64748b', cursor: 'pointer', fontWeight: 600,
              }}>← חזור</button>
            </div>

            {editingPerson.military && (
              <button onClick={() => handleChange(editingPerson, SPECIAL_BASE.name)} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                borderRadius: 10, width: '100%',
                background: draft[editingPerson.id]?.city === SPECIAL_BASE.name ? '#15803d' : '#dcfce7',
                color: draft[editingPerson.id]?.city === SPECIAL_BASE.name ? 'white' : '#15803d',
                fontSize: 14, fontWeight: 700,
                border: draft[editingPerson.id]?.city === SPECIAL_BASE.name ? 'none' : '1.5px solid #86efac',
                cursor: 'pointer',
              }}>
                <span>🪖</span><span>בסיס כלשהו</span>
                {draft[editingPerson.id]?.city === SPECIAL_BASE.name && <span style={{ marginRight: 'auto' }}>✓</span>}
              </button>
            )}

            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="חפש/י יישוב..."
              style={{ padding: '10px 12px', borderRadius: 10, border: '1.5px solid #3b82f6', fontSize: 14, background: '#f8fafc', direction: 'rtl' }}
            />

            <div style={{ flex: 1, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
              {filtered.map(l => (
                <button key={l.name} onClick={() => handleChange(editingPerson, l.name)} style={{
                  width: '100%', textAlign: 'right', padding: '10px 14px',
                  borderBottom: '1px solid #f1f5f9', background: draft[editingPerson.id]?.city === l.name ? '#eff6ff' : 'white',
                  color: draft[editingPerson.id]?.city === l.name ? '#1e40af' : '#1e293b',
                  fontWeight: draft[editingPerson.id]?.city === l.name ? 700 : 400,
                  fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  border: 'none', cursor: 'pointer',
                }}>
                  <span>{l.name}</span>
                  {draft[editingPerson.id]?.city === l.name && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px' }}>
            {displayList.map(person => {
              const currentCity = draft[person.id]?.city || null
              const cityData    = currentCity ? cityAlertData[currentCity] : null
              const cfg         = cityData ? alertLevelConfig[cityData.level] : null

              return (
                <button key={person.id} onClick={() => { setEditingId(person.id); setSearch('') }} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 10px', borderRadius: 12, marginBottom: 6,
                  background: 'white', border: '1.5px solid #e2e8f0',
                  textAlign: 'right', cursor: 'pointer',
                }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{person.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{person.name}</span>
                      {person.military && <span style={{ fontSize: 11 }}>🪖</span>}
                    </div>
                    <div style={{ fontSize: 12, color: currentCity ? '#64748b' : '#f59e0b', marginTop: 2 }}>
                      {currentCity
                        ? <span>📍 {currentCity}</span>
                        : <span>⚠️ מיקום לא הוגדר</span>
                      }
                    </div>
                  </div>
                  {cfg && (
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontWeight: 700, flexShrink: 0 }}>
                      {cfg.icon}
                    </span>
                  )}
                  <span style={{ fontSize: 18, color: '#94a3b8', flexShrink: 0 }}>›</span>
                </button>
              )
            })}
          </div>
        )}

        {!editingPerson && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
            <button onClick={() => { onSave(draft); onClose() }} style={{
              width: '100%', padding: '13px', borderRadius: 12,
              background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
              color: 'white', fontSize: 15, fontWeight: 700,
              border: 'none', cursor: 'pointer',
            }}>
              💾 שמור מיקומים
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// מסך ראשי
// ────────────────────────────────────────────────────────────
export default function MapScreen() {
  const { currentUser, shelter, toggleShelter, photos, statuses, allMembers, locations: contextLocations, saveLocations: contextSaveLocations } = useUser()

  const [period,       setPeriod]       = useState('today')
  const [showHeat,     setShowHeat]     = useState(true)
  const [showFamily,   setShowFamily]   = useState(true)
  const [showEdit,     setShowEdit]     = useState(false)
  const [liveAlert,    setLiveAlert]    = useState(null)
  const [realData,     setRealData]     = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [dataSource,   setDataSource]   = useState('mock')
  const [todayData,    setTodayData]    = useState({})
  const [todayLoaded,  setTodayLoaded]  = useState(false)
  const [editingId,    setEditingId]    = useState(null)
  const pollRef = useRef(null)

  // שעון חי
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const result = await fetchAlertsByPeriod(period)
      if (!cancelled) {
        const { data, source } = result
        setRealData(data)
        setDataSource(source === 'unavailable' ? 'mock' : 'real')
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [period])

  useEffect(() => {
    fetchAlertsByPeriod('today').then(result => {
      const { data } = result
      console.log('📊 נתוני פיקוד העורף - היום:', data)
      setTodayData(data)
      setTodayLoaded(true)
    })
  }, [])

  useEffect(() => {
    async function checkLive() {
      const alert = await fetchCurrentAlert()
      setLiveAlert(alert)
    }
    checkLive()
    pollRef.current = setInterval(checkLive, 10_000)
    return () => clearInterval(pollRef.current)
  }, [])

  const cityAlertData = realData || {}
  const heatCities = LOCALITIES.filter(c => cityAlertData[c.name])

  const locations = contextLocations
  const saveLocations = contextSaveLocations

  function resolveLocation(loc) {
    const city = loc?.city ?? null
    const isBase = city === SPECIAL_BASE.name
    return {
      city: city || null,
      lat: isBase ? SPECIAL_BASE.lat : (loc?.lat ?? DEFAULT_LOCATION.lat),
      lng: isBase ? SPECIAL_BASE.lng : (loc?.lng ?? DEFAULT_LOCATION.lng),
    }
  }

  const members = familyMembers.map(m => ({ ...m, ...resolveLocation(locations[m.id]) }))
  const kids = grandchildren.filter(c => !c.unborn).map(c => ({ ...c, isGrandchild: true, ...resolveLocation(locations[c.id]) }))

  const allPeople = [
    ...familyMembers.map(m => ({ ...m, ...resolveLocation(locations[m.id]) })),
    ...grandchildren.filter(c => !c.unborn).map(c => ({ ...c, isGrandchild: true, ...resolveLocation(locations[c.id]) })),
  ]

  const shelterList = allMembers.filter(m => shelter[m.id]?.active)
  const securityLevel = calcSecurityLevel(todayData, todayLoaded)

  const familyAlertCities = new Set(allPeople.filter(p => p.city).map(p => p.city))
  const totalAlerts = [...familyAlertCities].reduce((s, city) => s + (cityAlertData[city]?.alerts || 0), 0)

  const peopleWithCity = allPeople.filter(p => p.city)
  const sharedShelterMinutes24h = peopleWithCity
    .filter(p => todayData[p.city])
    .reduce((sum, p) => sum + (todayData[p.city]?.shelterMinutes || 0), 0)
  const shelterTimeLabel = !todayLoaded
    ? 'טוען...'
    : peopleWithCity.length === 0
      ? 'הגדר מיקומים'
      : sharedShelterMinutes24h === 0
        ? 'ללא אזעקות'
        : sharedShelterMinutes24h < 60
          ? `${sharedShelterMinutes24h} דק'`
          : `${Math.floor(sharedShelterMinutes24h / 60)}ש' ${sharedShelterMinutes24h % 60}ד'`

  const totalAlertsToday = [...new Set(allPeople.filter(p => p.city).map(p => p.city))]
    .reduce((s, city) => s + (todayData[city]?.alerts || 0), 0)

  const handleInlineLocationSelect = (personId, locationData) => {
    saveLocations({ ...locations, [personId]: locationData })
    setEditingId(null)
  }

  // תאריך עברי
  function getHebrewDate(date) {
    try {
      return new Intl.DateTimeFormat('he-IL-u-ca-hebrew', {
        year: 'numeric', month: 'long', day: 'numeric'
      }).format(date)
    } catch { return '' }
  }

  function isShabbat(date) {
    const day = date.getDay()
    const hour = date.getHours()
    return (day === 5 && hour >= 18) || (day === 6 && hour < 20)
  }

  function getHolidayGreeting(hd) {
    if (!hd) return null
    const m = hd.match(/(\d+)/)
    const d = m ? parseInt(m[1]) : 0
    if (hd.includes('ניסן') && d >= 15 && d <= 22) return 'חג פסח שמח! 🫓'
    if (hd.includes('סיוון') && d >= 6 && d <= 7) return 'חג שבועות שמח! 🌾'
    if (hd.includes('תשרי') && d >= 1 && d <= 2) return 'שנה טובה! 🍎🍯'
    if (hd.includes('תשרי') && d === 10) return 'גמר חתימה טובה 🕊️'
    if (hd.includes('תשרי') && d >= 15 && d <= 22) return 'חג סוכות שמח! 🌿'
    if (hd.includes('תשרי') && d === 23) return 'שמחת תורה שמח! 📜'
    if (hd.includes('כסלו') && d >= 25) return 'חנוכה שמח! 🕎'
    if (hd.includes('טבת') && d <= 2) return 'חנוכה שמח! 🕎'
    if (hd.includes('אדר') && d >= 14 && d <= 15) return 'פורים שמח! 🎭'
    return null
  }

  const hebrewDateStr = getHebrewDate(now)
  const shabbatNow = isShabbat(now)
  const holidayGreeting = getHolidayGreeting(hebrewDateStr)
  const greeting = holidayGreeting || (shabbatNow ? 'שבת שלום 🕯️' : null)

  const SWORDS_START = new Date('2023-10-07')
  const ROAR_START = new Date('2026-02-28')
  const daysSinceSwords = Math.floor((now - SWORDS_START) / (1000 * 60 * 60 * 24))
  const daysSinceRoar = Math.floor((now - ROAR_START) / (1000 * 60 * 60 * 24))


  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {liveAlert && (
        <div className="shelter-pulse" style={{
          background: 'linear-gradient(90deg, #7f1d1d, #dc2626)',
          color: 'white', padding: '10px 16px', flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 24 }}>🚨</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{liveAlert.title}</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>
              {Array.isArray(liveAlert.data) ? liveAlert.data.join(' · ') : liveAlert.data}
            </div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>{liveAlert.desc}</div>
          </div>
        </div>
      )}

      {shelterList.length > 0 && (
        <div className="shelter-pulse" style={{
          background: 'linear-gradient(90deg, #dc2626, #b91c1c)',
          color: 'white', padding: '8px 16px',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <span style={{ fontSize: 20 }}>🚨</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>
              {shelterList.map(m => m.name).join(', ')} — במקלט כרגע!
            </div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>
              {shelterList.length === 1 ? 'בן/בת משפחה אחד/ת' : `${shelterList.length} בני משפחה`} מדווחים על שהייה במקלט
            </div>
          </div>
        </div>
      )}

      {/* כפתור מקלט */}
      {currentUser && (
        <button
          onClick={() => toggleShelter(currentUser.id, !shelter[currentUser.id]?.active)}
          className={shelter[currentUser.id]?.active ? 'shelter-pulse' : ''}
          style={{
            margin: '6px 12px', padding: '10px 14px', borderRadius: 12, flexShrink: 0,
            background: shelter[currentUser.id]?.active
              ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
              : 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
            color: shelter[currentUser.id]?.active ? 'white' : '#475569',
            fontSize: 14, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            border: shelter[currentUser.id]?.active ? 'none' : '1.5px solid #cbd5e1',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 18 }}>{shelter[currentUser.id]?.active ? '🚨' : '🏠'}</span>
          {shelter[currentUser.id]?.active ? 'אני במקלט כרגע!' : 'לחץ/י כשאת/ה במקלט'}
        </button>
      )}

      {/* תאריך ושעה + ברכות + מוני מלחמה */}
      <div style={{
        padding: '8px 14px', background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0', flexShrink: 0,
        direction: 'rtl', textAlign: 'center',
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
          {now.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          {' · '}
          {hebrewDateStr}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#1e40af', margin: '2px 0' }}>
          {now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        {greeting && (
          <div style={{
            fontSize: 16, fontWeight: 800,
            color: shabbatNow ? '#7c3aed' : '#d97706',
            background: shabbatNow ? '#f5f3ff' : '#fffbeb',
            padding: '4px 16px', borderRadius: 20,
            display: 'inline-block', margin: '4px 0',
          }}>
            {greeting}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 4, fontSize: 11, color: '#64748b' }}>
          <span>⚔️ חרבות ברזל: יום {daysSinceSwords}</span>
          <span>🦁 שאגת הארי: יום {daysSinceRoar}</span>
        </div>
      </div>



      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a, #1e40af)',
        padding: '12px 16px', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 800, marginBottom: 1 }}>🗺️ מפה ומדד הביטחון</h1>
          <p style={{ fontSize: 11, opacity: 0.8 }}>נתוני פיקוד העורף</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setShowEdit(true)} style={{
            background: 'rgba(255,255,255,0.2)', borderRadius: 10,
            padding: '7px 12px', color: 'white', fontSize: 12, fontWeight: 700,
            border: 'none', cursor: 'pointer',
          }}>
            📍 ערוך
          </button>
          <div style={{ background: securityLevel.bg, borderRadius: 12, padding: '6px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: securityLevel.color, fontWeight: 700 }}>מדד ביטחון</div>
            <div style={{ fontSize: 20 }}>{securityLevel.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: securityLevel.color }}>{securityLevel.label}</div>
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex', gap: 6, padding: '8px 14px',
        background: 'white', borderBottom: '1px solid #e2e8f0',
        overflowX: 'auto', flexShrink: 0,
      }}>
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            style={{
              padding: '6px 12px', borderRadius: 20, whiteSpace: 'nowrap',
              background: period === p.key ? '#1e40af' : '#f1f5f9',
              color: period === p.key ? 'white' : '#475569',
              fontSize: 12, fontWeight: period === p.key ? 700 : 500,
              border: period === p.key ? 'none' : '1px solid #e2e8f0',
              flexShrink: 0,
              cursor: 'pointer',
            }}
          >
            {p.icon} {p.label}
          </button>
        ))}
        <div style={{
          marginRight: 'auto', fontSize: 10,
          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, paddingRight: 4,
          color: loading ? '#94a3b8' : dataSource === 'real' ? '#16a34a' : '#d97706',
          fontWeight: 600,
        }}>
          {loading ? '⏳ טוען...' : dataSource === 'real' ? '✅ פיקוד העורף' : '⚠️ נתונים מדומים'}
        </div>
      </div>

      <div style={{ flex: '0 0 220px', position: 'relative' }}>
        <MapContainer center={[31.5, 34.9]} zoom={7} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {showHeat && heatCities.map(city => {
            const data = cityAlertData[city.name]
            if (!data) return null
            return (
              <CircleMarker key={city.name} center={[city.lat, city.lng]}
                radius={levelRadius[data.level]} fillColor={levelColors[data.level]}
                color={levelColors[data.level]} weight={1} opacity={0.8} fillOpacity={0.35}>
                <Tooltip direction="top">
                  <span style={{ fontFamily: 'Heebo, Arial', direction: 'rtl', fontSize: 11 }}>
                    {city.name}: {data.alerts} אזעקות
                  </span>
                </Tooltip>
              </CircleMarker>
            )
          })}

          {showFamily && (() => {
            const grouped = {}
            const allWithCoords = [
              ...members.filter(m => m.lat && m.lng),
              ...kids.filter(c => c.lat && c.lng),
            ]
            for (const p of allWithCoords) {
              const key = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`
              if (!grouped[key]) grouped[key] = { lat: p.lat, lng: p.lng, people: [] }
              grouped[key].people.push(p)
            }

            return Object.values(grouped).map(({ lat, lng, people }) => {
              const anyInShelter = people.some(p => shelter[p.id]?.active)
              const count = people.length
              const hasMilitary = people.some(p => p.military && !p.isGrandchild)
              const allKids = people.every(p => p.isGrandchild)
              const fillColor = anyInShelter ? '#dc2626'
                : allKids ? '#f59e0b'
                : hasMilitary ? '#16a34a'
                : '#3b82f6'
              const radius = anyInShelter ? 12 : count > 1 ? 10 : 7

              return (
                <CircleMarker key={`${lat},${lng}`} center={[lat, lng]}
                  radius={radius}
                  fillColor={fillColor}
                  color={anyInShelter ? '#dc2626' : 'white'}
                  weight={anyInShelter ? 3 : 2} opacity={1} fillOpacity={anyInShelter ? 0.9 : 1}>
                  <Popup>
                    <div style={{ fontFamily: 'Heebo, Arial', direction: 'rtl', textAlign: 'right', fontSize: 13, minWidth: 140 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>📍 {people[0].city}</div>
                      {people.map(p => (
                        <div key={p.id} style={{ marginBottom: 2 }}>
                          <strong>{p.name}</strong>
                          {p.isGrandchild ? ' 🧒' : ` — ${p.role}`}
                          {shelter[p.id]?.active && <span style={{ color: '#dc2626', fontWeight: 700 }}> 🚨 במקלט!</span>}
                        </div>
                      ))}
                      {count > 1 && (
                        <div style={{ marginTop: 4, fontSize: 11, color: '#64748b' }}>
                          {count} אנשים במיקום זה
                        </div>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })
          })()}
        </MapContainer>

        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 999, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button onClick={() => setShowHeat(!showHeat)} style={{ padding: '5px 9px', borderRadius: 7, background: showHeat ? '#dc2626' : 'white', color: showHeat ? 'white' : '#64748b', fontSize: 10, fontWeight: 600, boxShadow: '0 2px 6px rgba(0,0,0,0.15)', fontFamily: 'Heebo, Arial', border: 'none', cursor: 'pointer' }}>
            🔥 אזעקות
          </button>
          <button onClick={() => setShowFamily(!showFamily)} style={{ padding: '5px 9px', borderRadius: 7, background: showFamily ? '#3b82f6' : 'white', color: showFamily ? 'white' : '#64748b', fontSize: 10, fontWeight: 600, boxShadow: '0 2px 6px rgba(0,0,0,0.15)', fontFamily: 'Heebo, Arial', border: 'none', cursor: 'pointer' }}>
            👨‍👩‍👧 משפחה
          </button>
        </div>

        <div style={{ position: 'absolute', bottom: 8, left: 8, zIndex: 999, background: 'rgba(255,255,255,0.93)', borderRadius: 8, padding: '5px 9px', fontSize: 10, boxShadow: '0 2px 6px rgba(0,0,0,0.15)', fontFamily: 'Heebo, Arial', direction: 'rtl' }}>
          {Object.entries(alertLevelConfig).map(([key, cfg]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
              <span style={{ color: '#374151' }}>{cfg.label}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2, borderTop: '1px solid #e2e8f0', paddingTop: 2, marginTop: 2 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
            <span style={{ color: '#374151' }}>מבוגר</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
            <span style={{ color: '#374151' }}>נין</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
            <span style={{ color: '#dc2626', fontWeight: 700 }}>במקלט</span>
          </div>
        </div>
      </div>

      {/* ── רשימת בני משפחה ───────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'אזעקות היום', value: totalAlertsToday || (todayLoaded ? '0' : '—'), icon: '🚨', color: '#dc2626', bg: '#fee2e2' },
            { label: 'ממד 24ש׳', value: shelterTimeLabel, icon: '🏠', color: '#7c3aed', bg: '#f5f3ff' },
            { label: 'מדד ביטחון',   value: securityLevel.label, icon: securityLevel.icon, color: securityLevel.color, bg: securityLevel.bg },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 18 }}>{s.icon}</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: s.color, opacity: 0.8 }}>{s.label}</div>
            </div>
          ))}
        </div>


        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>מצב ביטחוני לפי בני משפחה</div>
          <button onClick={() => setShowEdit(true)} style={{ fontSize: 11, color: '#3b82f6', fontWeight: 700, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '3px 10px', cursor: 'pointer' }}>
            📍 ערוך מיקומים
          </button>
        </div>

        {members.map(member => {
          const cityData  = cityAlertData[member.city] || { alerts: 0, level: 'low' }
          const cfg       = alertLevelConfig[cityData.level]
          const inShelter = shelter[member.id]?.active
          const photo     = photos[member.id]
          const status    = getStatus(statuses[member.id])
          const isEditing = editingId === member.id

          return (
            <div key={member.id}>
              <div style={{
                background: 'white', borderRadius: 11,
                padding: '10px 12px', marginBottom: isEditing ? 0 : 7,
                display: 'flex', alignItems: 'center', gap: 10,
                boxShadow: inShelter ? '0 0 0 2px #dc2626' : '0 1px 3px rgba(0,0,0,0.06)',
                border: isEditing ? '2px solid #3b82f6' : '2px solid transparent',
              }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: inShelter ? '#fee2e2' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, overflow: 'hidden', border: inShelter ? '2px solid #dc2626' : '2px solid #e2e8f0', flexShrink: 0 }}>
                  {photo ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : member.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
                    {member.name}
                    {member.military && <span style={{ marginRight: 4, fontSize: 11 }}>🪖</span>}
                  </div>
                  {inShelter
                    ? <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }}>🚨 במקלט כרגע!</div>
                    : member.city
                      ? <button
                          onClick={() => setEditingId(isEditing ? null : member.id)}
                          style={{ fontSize: 11, color: isEditing ? '#1e40af' : '#64748b', display: 'flex', alignItems: 'center', gap: 5, background: isEditing ? '#eff6ff' : 'none', padding: isEditing ? '2px 8px' : 0, border: isEditing ? '1px solid #bfdbfe' : 'none', borderRadius: 8, cursor: 'pointer', marginTop: 4, fontWeight: isEditing ? 700 : 400 }}
                        >
                          <span>📍 {member.city}</span>
                          <span style={{ fontSize: 10, opacity: 0.6 }}>{isEditing ? '▲' : '✏️'}</span>
                          {status && !isEditing && (
                            <span style={{ background: status.bg, color: status.color, padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>
                              {status.icon} {status.label}
                            </span>
                          )}
                        </button>
                      : <button onClick={() => setEditingId(member.id)} style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, background: 'none', padding: 0, textDecoration: 'underline', border: 'none', cursor: 'pointer' }}>
                          📍 הגדר מיקום
                        </button>
                  }
                </div>
                {member.city && !isEditing
                  ? <div style={{ background: cfg.bg, color: cfg.color, fontSize: 10, padding: '2px 8px', borderRadius: 16, fontWeight: 700 }}>
                      {cfg.icon} {cfg.label}
                    </div>
                  : null
                }
              </div>
              {isEditing && (
                <div style={{ marginBottom: 7 }}>
                  <InlineLocationPicker
                    person={member}
                    currentCity={member.city || null}
                    onSelect={handleInlineLocationSelect}
                    onClose={() => setEditingId(null)}
                  />
                </div>
              )}
            </div>
          )
        })}

        <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, margin: '12px 0 8px' }}>הנכדים האהובים</div>
        {kids.map(child => {
          const cityData = cityAlertData[child.city] || { alerts: 0, level: 'low' }
          const cfg      = alertLevelConfig[cityData.level]
          const isEditing = editingId === child.id

          return (
            <div key={child.id}>
              <div style={{
                background: 'white', borderRadius: 11,
                padding: '10px 12px', marginBottom: isEditing ? 0 : 7,
                display: 'flex', alignItems: 'center', gap: 10,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                border: isEditing ? '2px solid #3b82f6' : '2px solid transparent',
              }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, border: '2px solid #fcd34d', flexShrink: 0 }}>
                  {child.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{child.name}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{child.parents}</div>
                  {child.city
                    ? <button
                        onClick={() => setEditingId(isEditing ? null : child.id)}
                        style={{ fontSize: 11, color: isEditing ? '#1e40af' : '#64748b', background: isEditing ? '#eff6ff' : 'none', padding: isEditing ? '2px 8px' : 0, border: isEditing ? '1px solid #bfdbfe' : 'none', borderRadius: 8, cursor: 'pointer', marginTop: 4, fontWeight: isEditing ? 700 : 400, display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <span>📍 {child.city}</span>
                        <span style={{ fontSize: 10, opacity: 0.6 }}>{isEditing ? '▲' : '✏️'}</span>
                      </button>
                    : <button onClick={() => setEditingId(child.id)} style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, background: 'none', padding: 0, textDecoration: 'underline', border: 'none', cursor: 'pointer' }}>
                        📍 הגדר מיקום
                      </button>
                  }
                </div>
                {child.city && !isEditing
                  ? <div style={{ background: cfg.bg, color: cfg.color, fontSize: 10, padding: '2px 8px', borderRadius: 16, fontWeight: 700 }}>
                      {cfg.icon} {cfg.label}
                    </div>
                  : null
                }
              </div>
              {isEditing && (
                <div style={{ marginBottom: 7 }}>
                  <InlineLocationPicker
                    person={child}
                    currentCity={child.city || null}
                    onSelect={handleInlineLocationSelect}
                    onClose={() => setEditingId(null)}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showEdit && (
        <EditLocationsModal
          allPeople={allPeople}
          locations={locations}
          onSave={saveLocations}
          onClose={() => setShowEdit(false)}
          cityAlertData={cityAlertData}
        />
      )}
    </div>
  )
}
