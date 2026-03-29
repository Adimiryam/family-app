import { useState, useEffect, useRef } from 'react'
import { LOCALITIES_SORTED } from '../../utils/mapUtils'
import { localityCoords, SPECIAL_BASE } from '../../data/israeliLocalities'

export default function InlineLocationPicker({ person, currentCity, onSelect, onClose }) {
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