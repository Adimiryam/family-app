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
  }, [])

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
      {/* שדה חיפוש */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderBottom: '1px solid #e2e8f0', background: 'white' }}>
        <span style={{ fontSize: 13 }}>🔍</span>
        <input
          ref={inputRef}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="חפש ישוב..."
          style={{
            flex: 1, border: 'none', outline: 'none',
            fontSize: 13, color: '#1e293b', background: 'transparent',
            direction: 'rtl',
          }}
        />
        <button onClick={onClose} style={{ fontSize: 16, color: '#94a3b8', background: 'none', padding: '0 2px' }}>✕</button>
      </div>
      {/* רשימה */}
      <div style={{ maxHeight: 180, overflowY: 'auto' }}>
        {/* אפשרות בסיס */}
        {(!search || SPECIAL_BASE.name.includes(search)) && (
          <button
            onClick={() => handleSelect(SPECIAL_BASE.name)}
            style={{
              width: '100%', textAlign: 'right', padding: '9px 12px',
              background: currentCity === SPECIAL_BASE.name ? '#eff6ff' : 'transparent',
              color: currentCity === SPECIAL_BASE.name ? '#1e40af' : '#475569',
              fontSize: 13, fontWeight: currentCity === SPECIAL_BASE.name ? 700 : 400,
              borderBottom: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {currentCity === SPECIAL_BASE.name && <span>✓</span>}
            <span>🏕️ {SPECIAL_BASE.name}</span>
          </button>
        )}
        {filtered.map(loc => (
          <button
            key={loc.name}
            onClick={() => handleSelect(loc.name)}
            style={{
              width: '100%', textAlign: 'right', padding: '9px 12px',
              background: currentCity === loc.name ? '#eff6ff' : 'transparent',
              color: currentCity === loc.name ? '#1e40af' : '#475569',
              fontSize: 13, fontWeight: currentCity === loc.name ? 700 : 400,
              borderBottom: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
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
// כרטיס במפה
// ────────────────────────────────────────────────────────────
function PersonMapMarker({ person, city, shelter, photo, statusKey, alertData }) {
  const inShelter = shelter[person.id]?.active
  const coords = city ? (localityCoords[city] || DEFAULT_LOCATION) : DEFAULT_LOCATION
  const status = getStatus(statusKey)
  const todayAlerts = alertData.today?.[city]?.alerts ?? null

  const color = inShelter
    ? '#dc2626'
    : status?.color || '#3b82f6'

  return (
    <CircleMarker
      center={[coords.lat, coords.lng]}
      radius={6}
      fillColor={color}
      color="white"
      weight={2}
      opacity={1}
      fillOpacity={0.8}
    >
      <Popup>
        <div style={{ padding: '4px 0', fontSize: 13 }}>
          <strong>{person.name}</strong>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            📍 {city || 'ללא מיקום'}
          </div>
          {inShelter && <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 700, marginTop: 2 }}>🚨 במקלט</div>}
          {status && <div style={{ fontSize: 11, color: status.color, marginTop: 2 }}>{status.icon} {status.label}</div>}
          {todayAlerts !== null && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>🚨 {todayAlerts} היום</div>}
        </div>
      </Popup>
      <Tooltip>
        <span>{person.name}</span>
      </Tooltip>
    </CircleMarker>
  )
}

// ────────────────────────────────────────────────────────────
// מסך מפה
// ────────────────────────────────────────────────────────────
export default function MapScreen() {
  const { currentUser, shelter, photos, statuses, locations } = useUser()
  const [alertData, setAlertData] = useState({ today: {}, yesterday: {}, week: {}, sinceWar: {} })
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('today')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [today, yesterday, week, sinceWar] = await Promise.all([
        fetchAlertsByPeriod('today'),
        fetchAlertsByPeriod('yesterday'),
        fetchAlertsByPeriod('week'),
        fetchAlertsByPeriod('sinceWar'),
      ])
      setAlertData({
        today: today.data || {},
        yesterday: yesterday.data || {},
        week: week.data || {},
        sinceWar: sinceWar.data || {},
      })
      setLoading(false)
    }
    load()
  }, [])

  const currentPeriodData = alertData[period] || {}
  const securityLevel = calcSecurityLevel(currentPeriodData, !loading)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8fafc' }}>
      {/* כותרת */}
      <div style={{
        background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
        padding: '16px 16px 12px', color: 'white',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>🗺️ המפה שלנו</h1>
          <p style={{ fontSize: 12, opacity: 0.85 }}>מצב ביטחוני כללי בהשפעת אזעקות</p>
        </div>
        <div className="shelter-pulse" style={{
          background: securityLevel.bg, color: securityLevel.color,
          padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800, textAlign: 'center',
        }}>
          {securityLevel.icon} {securityLevel.label}
        </div>
      </div>

      {/* בורר תקופה */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '8px 12px' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', justifyContent: 'center' }}>
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              style={{
                padding: '6px 12px', borderRadius: 8,
                background: period === p.key ? '#1e40af' : '#e2e8f0',
                color: period === p.key ? 'white' : '#475569',
                fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {p.icon} {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* מפה */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, zIndex: 10,
          }}>
            <span>טוען נתוני אזעקות...</span>
          </div>
        )}
        <MapContainer center={[31.5, 34.9]} zoom={8} style={{ width: '100%', height: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          {familyMembers.map(m => (
            <PersonMapMarker
              key={m.id} person={m}
              city={locations[m.id]?.city || null}
              shelter={shelter}
              photo={photos[m.id]}
              statusKey={statuses[m.id]}
              alertData={alertData}
            />
          ))}
          {grandchildren.map(c => (
            <PersonMapMarker
              key={c.id} person={c}
              city={locations[c.id]?.city || null}
              shelter={shelter}
              photo={photos[c.id]}
              statusKey={statuses[c.id]}
              alertData={alertData}
            />
          ))}
        </MapContainer>
      </div>

      {/* סטטיסטיקות תחתונות */}
      {!loading && (
        <div style={{
          background: 'white', borderTop: '1px solid #e2e8f0',
          padding: '12px 16px', fontSize: 12, color: '#64748b',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <span style={{ fontWeight: 700, color: '#1e293b' }}>{Object.values(currentPeriodData).filter(d => d.alerts > 0).length}</span> ישובים עם אזעקות
            </div>
            <div>
              <span style={{ fontWeight: 700, color: '#1e293b' }}>{Object.values(currentPeriodData).reduce((sum, d) => sum + (d.alerts || 0), 0)}</span> אזעקות בסה"כ
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
