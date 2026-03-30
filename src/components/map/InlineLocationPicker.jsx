import { useState, useEffect, useRef } from 'react'
import { LOCALITIES_SORTED } from '../../utils/mapUtils'
import { localityCoords, SPECIAL_BASE } from '../../data/israeliLocalities'

// ── מציאת עיר הקרובה ביותר לקואורדינטות GPS ────────────
function findNearestCity(lat, lng) {
  let nearest = null
  let minDist = Infinity
  for (const loc of LOCALITIES_SORTED) {
    const coords = localityCoords[loc.name]
    if (!coords) continue
    const d = Math.sqrt((coords.lat - lat) ** 2 + (coords.lng - lng) ** 2)
    if (d < minDist) { minDist = d; nearest = loc.name }
  }
  return nearest
}

export default function InlineLocationPicker({ person, currentCity, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState('')
  const inputRef = useRef()
  const containerRef = useRef()

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80)
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) onClose()
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

  const handleGPS = () => {
    if (!navigator.geolocation) { setGpsError('GPS לא נתמך במכשיר זה'); return }
    setGpsLoading(true)
    setGpsError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        const nearest = findNearestCity(latitude, longitude)
        setGpsLoading(false)
        if (nearest) {
          handleSelect(nearest)
        } else {
          setGpsError('לא נמצא יישוב קרוב')
        }
      },
      (err) => {
        setGpsLoading(false)
        setGpsError(err.code === 1 ? 'אנא אשר/י גישה למיקום' : 'שגיאה בקבלת מיקום')
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  return (
    <div ref={containerRef} style={{ marginTop: 8, borderRadius: 12, background: '#f8fafc', border: '1.5px solid #3b82f6', overflow: 'hidden' }}>
      {/* כפתור GPS */}
      <button
        onClick={handleGPS}
        disabled={gpsLoading}
        style={{
          width: '100%', padding: '10px 14px',
          background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
          color: 'white', fontSize: 14, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          border: 'none', cursor: gpsLoading ? 'wait' : 'pointer',
          borderBottom: '2px solid #1e3a8a',
        }}
      >
        <span>{gpsLoading ? '⏳' : '📍'}</span>
        <span>{gpsLoading ? 'מאתר מיקום...' : 'המיקום שלי (GPS)'}</span>
      </button>
      {gpsError && (
        <div style={{ padding: '6px 14px', background: '#fee2e2', color: '#dc2626', fontSize: 12, fontWeight: 600 }}>
          {gpsError}
        </div>
      )}

      {/* חיפוש */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderBottom: '1px solid #e2e8f0', background: 'white' }}>
        <span style={{ fontSize: 13 }}>🔍</span>
        <input
          ref={inputRef}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="או חפש ישוב..."
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: '#1e293b', background: 'transparent', direction: 'rtl' }}
        />
        <button onClick={onClose} style={{ fontSize: 16, color: '#94a3b8', background: 'none', padding: '0 2px', border: 'none', cursor: 'pointer' }}>✕</button>
      </div>

      {/* בסיס כלשהו */}
      {(!search || SPECIAL_BASE.name.includes(search)) && (
        <button onClick={() => handleSelect(SPECIAL_BASE.name)} style={{
          width: '100%', textAlign: 'right', padding: '10px 14px',
          background: currentCity === SPECIAL_BASE.name ? '#15803d' : '#dcfce7',
          color: currentCity === SPECIAL_BASE.name ? 'white' : '#15803d',
          fontSize: 14, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 8,
          border: 'none', borderBottom: '2px solid #86efac', cursor: 'pointer',
        }}>
          {currentCity === SPECIAL_BASE.name && <span>✓</span>}
          <span>🪖 {SPECIAL_BASE.name}</span>
          <span style={{ fontSize: 11, opacity: 0.7, marginRight: 'auto' }}>(יופיע ליד יערות הכרמל)</span>
        </button>
      )}

      {/* רשימת ישובים */}
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
