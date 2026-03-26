import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet'
import { useUser } from '../App'
import { familyMembers, grandchildren, alertLevelConfig, WAR_START_DATE } from '../data/familyData'
import { LOCALITIES, localityCoords, SPECIAL_BASE } from '../data/israeliLocalities'
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

// מדד לפי סך אזעקות בכל הארץ היום (לא לפי עיר — למניעת בעיות שמות)
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
// מודל עריכת מיקומים
// ────────────────────────────────────────────────────────────
function EditLocationsModal({ allPeople, locations, onSave, onClose, cityAlertData }) {
  const [draft, setDraft]       = useState({ ...locations })
  const [tab, setTab]           = useState('adults')
  const [editingId, setEditingId] = useState(null)  // מי פתוח לעריכה
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

        {/* כותרת */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1e293b' }}>📍 ערוך מיקומים</h2>
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>לחץ/י על שם כדי לערוך</p>
          </div>
          <button onClick={onClose} style={{ fontSize: 22, background: 'none', color: '#94a3b8' }}>✕</button>
        </div>

        {/* טאבים */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 16px', flexShrink: 0 }}>
          {[['adults','👨‍👩‍👧 מבוגרים'],['kids','🧒 נכדים']].map(([k,l]) => (
            <button key={k} onClick={() => { setTab(k); setEditingId(null) }} style={{
              padding: '10px 14px', background: 'none',
              borderBottom: tab === k ? '2px solid #1e40af' : '2px solid transparent',
              color: tab === k ? '#1e40af' : '#64748b', fontSize: 13,
              fontWeight: tab === k ? 700 : 400, marginBottom: -1,
            }}>{l}</button>
          ))}
        </div>

        {/* עורך לאדם ספציפי */}
        {editingPerson ? (
          <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* כותרת עורך */}
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

            {/* בסיס כלשהו */}
            {editingPerson.military && (
              <button onClick={() => handleChange(editingPerson, SPECIAL_BASE.name)} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                borderRadius: 10, width: '100%',
                background: draft[editingPerson.id]?.city === SPECIAL_BASE.name ? '#15803d' : '#dcfce7',
                color: draft[editingPerson.id]?.city === SPECIAL_BASE.name ? 'white' : '#15803d',
                fontSize: 14, fontWeight: 700,
                border: draft[editingPerson.id]?.city === SPECIAL_BASE.name ? 'none' : '1.5px solid #86efac',
              }}>
                <span>🪖</span><span>בסיס כלשהו</span>
                {draft[editingPerson.id]?.city === SPECIAL_BASE.name && <span style={{ marginRight: 'auto' }}>✓</span>}
              </button>
            )}

            {/* חיפוש */}
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="חפש/י יישוב..."
              style={{ padding: '10px 12px', borderRadius: 10, border: '1.5px solid #3b82f6', fontSize: 14, background: '#f8fafc', direction: 'rtl' }}
            />

            {/* רשימת יישובים */}
            <div style={{ flex: 1, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
              {filtered.map(l => (
                <button key={l.name} onClick={() => handleChange(editingPerson, l.name)} style={{
                  width: '100%', textAlign: 'right', padding: '10px 14px',
                  borderBottom: '1px solid #f1f5f9', background: draft[editingPerson.id]?.city === l.name ? '#eff6ff' : 'white',
                  color: draft[editingPerson.id]?.city === l.name ? '#1e40af' : '#1e293b',
                  fontWeight: draft[editingPerson.id]?.city === l.name ? 700 : 400,
                  fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span>{l.name}</span>
                  {draft[editingPerson.id]?.city === l.name && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* רשימת אנשים */
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

        {/* שמור */}
        {!editingPerson && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
            <button onClick={() => { onSave(draft); onClose() }} style={{
              width: '100%', padding: '13px', borderRadius: 12,
              background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
              color: 'white', fontSize: 15, fontWeight: 700,
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
  const { shelter, photos, statuses, allMembers, locations: contextLocations, saveLocations: contextSaveLocations } = useUser()

  const [period,       setPeriod]       = useState('today')
  const [showHeat,     setShowHeat]     = useState(true)
  const [showFamily,   setShowFamily]   = useState(true)
  const [showEdit,     setShowEdit]     = useState(false)
  const [liveAlert,    setLiveAlert]    = useState(null)   // אזעקה פעילה עכשיו
  const [realData,     setRealData]     = useState(null)   // נתונים מפיקוד העורף
  const [loading,      setLoading]      = useState(false)
  const [dataSource,   setDataSource]   = useState('mock') // 'real' | 'mock'
  const [todayData,    setTodayData]    = useState({})     // נתוני 24 שעות אחרונות למדד
  const [todayLoaded,  setTodayLoaded]  = useState(false)  // האם קיבלנו נתונים אמיתיים מפיקוד העורף
  const pollRef = useRef(null)

  // ── שליפת נתוני תקופה ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const data = await fetchAlertsByPeriod(period)
      if (!cancelled) {
        if (data && Object.keys(data).length > 0) {
          setRealData(data)
          setDataSource('real')
        } else {
          setRealData(null)
          setDataSource('mock')
        }
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [period])

  // ── שליפת נתוני היום למדד ביטחון (תמיד 24 שעות אחרונות) ────
  useEffect(() => {
    fetchAlertsByPeriod('today').then(data => {
      console.log('📊 נתוני פיקוד העורף - היום:', data)
      if (data !== null) {
        setTodayData(data)
        setTodayLoaded(true)
      }
    })
  }, [])

  // ── פולינג אזעקות חיות כל 10 שניות ──────────────────────────
  useEffect(() => {
    async function checkLive() {
      const alert = await fetchCurrentAlert()
      setLiveAlert(alert)
    }
    checkLive()
    pollRef.current = setInterval(checkLive, 10_000)
    return () => clearInterval(pollRef.current)
  }, [])

  // נתוני תקופה — מפיקוד העורף בלבד, ריק אם לא נטען
  const cityAlertData = (realData && Object.keys(realData).length > 0) ? realData : {}

  const heatCities = LOCALITIES.filter(c => cityAlertData[c.name])

  // משתמשים במיקומים מה-context הגלובלי
  const locations = contextLocations
  const saveLocations = contextSaveLocations

  // מיזוג מיקומים שמורים — בסיס כלשהו תמיד מקבל קואורדינטות מלון יערות הכרמל
  function resolveLocation(loc) {
    const city = loc?.city ?? null
    const isBase = city === SPECIAL_BASE.name
    return {
      city,
      lat: isBase ? SPECIAL_BASE.lat : (loc?.lat ?? null),
      lng: isBase ? SPECIAL_BASE.lng : (loc?.lng ?? null),
    }
  }

  const members = familyMembers.map(m => ({ ...m, ...resolveLocation(locations[m.id]) }))
  const kids = grandchildren.map(c => ({ ...c, isGrandchild: true, ...resolveLocation(locations[c.id]) }))

  const allPeople = [
    ...familyMembers.map(m => ({ ...m, ...resolveLocation(locations[m.id]) })),
    ...grandchildren.map(c => ({ ...c, isGrandchild: true, ...resolveLocation(locations[c.id]) })),
  ]

  const shelterList = allMembers.filter(m => shelter[m.id]?.active)
  const securityLevel = calcSecurityLevel(todayData, todayLoaded)

  // אזעקות היום — רק בערים שיש שם בני משפחה
  const familyAlertCities = new Set(allPeople.filter(p => p.city).map(p => p.city))
  const totalAlerts = [...familyAlertCities].reduce((s, city) => s + (cityAlertData[city]?.alerts || 0), 0)

  // זמן ממד משותף — סכום דקות ממד של כל בני המשפחה לפי הטווח הנבחר
  const peopleWithCity = allPeople.filter(p => p.city)
  const sharedShelterMinutes = peopleWithCity
    .filter(p => cityAlertData[p.city])
    .reduce((sum, p) => sum + (cityAlertData[p.city]?.shelterMinutes || 0), 0)
  const shelterTimeLabel = loading
    ? 'טוען...'
    : peopleWithCity.length === 0
      ? 'הגדר מיקומים'
      : sharedShelterMinutes === 0
        ? 'ללא אזעקות'
        : sharedShelterMinutes < 60
          ? `${sharedShelterMinutes} דק'`
          : `${Math.floor(sharedShelterMinutes / 60)}ש' ${sharedShelterMinutes % 60}ד'`

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── אזעקה חיה מפיקוד העורף ────────────────────────────────── */}
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

      {/* ── כרזת מקלט (כשיש מישהו במקלט) ───────────────────────── */}
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

      {/* ── כותרת ─────────────────────────────────────────────────── */}
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

      {/* ── בורר תקופה ────────────────────────────────────────────── */}
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

      {/* ── מפה ───────────────────────────────────────────────────── */}
      <div style={{ flex: '0 0 220px', position: 'relative' }}>
        <MapContainer center={[31.5, 34.9]} zoom={7} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {/* מפת חום */}
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

          {/* מבוגרים */}
          {showFamily && members.filter(m => m.lat && m.lng).map(member => {
            const inShelter = shelter[member.id]?.active
            return (
              <CircleMarker key={member.id} center={[member.lat, member.lng]}
                radius={inShelter ? 10 : 7}
                fillColor={inShelter ? '#dc2626' : member.military ? '#16a34a' : '#3b82f6'}
                color={inShelter ? '#dc2626' : 'white'}
                weight={inShelter ? 3 : 2} opacity={1} fillOpacity={inShelter ? 0.9 : 1}>
                <Popup>
                  <div style={{ fontFamily: 'Heebo, Arial', direction: 'rtl', textAlign: 'right', fontSize: 13 }}>
                    <strong>{member.name}</strong> — {member.role}<br />
                    📍 {member.city}
                    {inShelter && <div style={{ color: '#dc2626', fontWeight: 700 }}>🚨 במקלט כרגע!</div>}
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}

          {/* נכדים */}
          {showFamily && kids.filter(c => c.lat && c.lng).map(child => (
            <CircleMarker key={child.id} center={[child.lat, child.lng]}
              radius={5} fillColor="#f59e0b" color="white" weight={2} opacity={1} fillOpacity={1}>
              <Popup>
                <div style={{ fontFamily: 'Heebo, Arial', direction: 'rtl', textAlign: 'right', fontSize: 13 }}>
                  <strong>{child.name}</strong> 🧒<br />📍 {child.city}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* כפתורי שכבות */}
        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 999, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button onClick={() => setShowHeat(!showHeat)} style={{ padding: '5px 9px', borderRadius: 7, background: showHeat ? '#dc2626' : 'white', color: showHeat ? 'white' : '#64748b', fontSize: 10, fontWeight: 600, boxShadow: '0 2px 6px rgba(0,0,0,0.15)', fontFamily: 'Heebo, Arial' }}>
            🔥 אזעקות
          </button>
          <button onClick={() => setShowFamily(!showFamily)} style={{ padding: '5px 9px', borderRadius: 7, background: showFamily ? '#3b82f6' : 'white', color: showFamily ? 'white' : '#64748b', fontSize: 10, fontWeight: 600, boxShadow: '0 2px 6px rgba(0,0,0,0.15)', fontFamily: 'Heebo, Arial' }}>
            👨‍👩‍👧 משפחה
          </button>
        </div>

        {/* מקרא */}
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
            { label: 'אזעקות היום', value: totalAlerts || '—',   icon: '🚨', color: '#dc2626', bg: '#fee2e2' },
            { label: 'זמן ממד משותף', value: shelterTimeLabel,    icon: '🏠', color: '#7c3aed', bg: '#f5f3ff' },
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
          <button onClick={() => setShowEdit(true)} style={{ fontSize: 11, color: '#3b82f6', fontWeight: 700, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '3px 10px' }}>
            📍 ערוך מיקומים
          </button>
        </div>

        {members.map(member => {
          const cityData  = cityAlertData[member.city] || { alerts: 0, level: 'low' }
          const cfg       = alertLevelConfig[cityData.level]
          const inShelter = shelter[member.id]?.active
          const photo     = photos[member.id]
          const status    = getStatus(statuses[member.id])

          return (
            <div key={member.id} style={{
              background: 'white', borderRadius: 11,
              padding: '10px 12px', marginBottom: 7,
              display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: inShelter ? '0 0 0 2px #dc2626' : '0 1px 3px rgba(0,0,0,0.06)',
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
                    ? <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span>📍 {member.city}</span>
                        {status && (
                          <span style={{ background: status.bg, color: status.color, padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>
                            {status.icon} {status.label}
                          </span>
                        )}
                      </div>
                    : <button onClick={() => setShowEdit(true)} style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, background: 'none', padding: 0, textDecoration: 'underline' }}>
                        📍 הגדר מיקום
                      </button>
                }
              </div>
              {member.city
                ? <div style={{ background: cfg.bg, color: cfg.color, fontSize: 10, padding: '2px 8px', borderRadius: 16, fontWeight: 700 }}>
                    {cfg.icon} {cfg.label}
                  </div>
                : null
              }
            </div>
          )
        })}

        {/* ── נכדים ─────────────────────────────────────────────── */}
        <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, margin: '12px 0 8px' }}>הנכדים האהובים</div>
        {kids.map(child => {
          const cityData = cityAlertData[child.city] || { alerts: 0, level: 'low' }
          const cfg      = alertLevelConfig[cityData.level]
          return (
            <div key={child.id} style={{
              background: 'white', borderRadius: 11,
              padding: '10px 12px', marginBottom: 7,
              display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, border: '2px solid #fcd34d', flexShrink: 0 }}>
                {child.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{child.name}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{child.parents}</div>
                {child.city
                  ? <div style={{ fontSize: 11, color: '#64748b' }}>📍 {child.city}</div>
                  : <button onClick={() => setShowEdit(true)} style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, background: 'none', padding: 0, textDecoration: 'underline' }}>
                      📍 הגדר מיקום
                    </button>
                }
              </div>
              {child.city
                ? <div style={{ background: cfg.bg, color: cfg.color, fontSize: 10, padding: '2px 8px', borderRadius: 16, fontWeight: 700 }}>
                    {cfg.icon} {cfg.label}
                  </div>
                : null
              }
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
