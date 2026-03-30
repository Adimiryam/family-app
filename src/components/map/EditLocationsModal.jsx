import { useState } from 'react'
import { LOCALITIES_SORTED } from '../../utils/mapUtils'
import { localityCoords, SPECIAL_BASE } from '../../data/israeliLocalities'
import { alertLevelConfig } from '../../data/familyData'

export default function EditLocationsModal({ currentUser, locations, onSave, onClose, cityAlertData }) {
  const [search, setSearch] = useState('')

  if (!currentUser) return null

  const currentCity = locations[currentUser.id]?.city || null
  const cityData = currentCity ? (cityAlertData[currentCity] || null) : null
  const cfg = cityData ? alertLevelConfig[cityData.level] : null

  const filtered = search.trim()
    ? LOCALITIES_SORTED.filter(l => l.name.includes(search.trim()))
    : LOCALITIES_SORTED

  const handleSelect = (cityName) => {
    const coords = cityName === SPECIAL_BASE.name
      ? { lat: SPECIAL_BASE.lat, lng: SPECIAL_BASE.lng }
      : (localityCoords[cityName] || { lat: 31.5, lng: 34.9 })
    const updated = { ...locations, [currentUser.id]: { city: cityName, lat: coords.lat, lng: coords.lng, updatedAt: new Date().toISOString() } }
    onSave(updated)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, margin: '0 auto', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>

        {/* כותרת */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1e293b' }}>📍 עדכן מיקום</h2>
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>עדכון המיקום של {currentUser.name}</p>
          </div>
          <button onClick={onClose} style={{ fontSize: 22, background: 'none', color: '#94a3b8', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>

        {/* פרופיל + מיקום נוכחי */}
        <div style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 28 }}>{currentUser.emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#1e293b' }}>{currentUser.name}</div>
            <div style={{ fontSize: 13, color: currentCity ? '#64748b' : '#f59e0b', marginTop: 2 }}>
              {currentCity ? `📍 ${currentCity}` : '⚠️ מיקום לא הוגדר'}
            </div>
          </div>
          {cfg && (
            <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontWeight: 700 }}>
              {cfg.icon} {cfg.label}
            </span>
          )}
        </div>

        {/* חיפוש ישוב */}
        <div style={{ padding: '12px 20px 8px', flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>בחר/י ישוב מהרשימה:</div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חפש/י ישוב..."
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, background: '#f8fafc', direction: 'rtl' }}
          />
        </div>

        {/* בסיס */}
        {currentUser.military && (!search || SPECIAL_BASE.name.includes(search)) && (
          <div style={{ padding: '0 20px', flexShrink: 0 }}>
            <button onClick={() => handleSelect(SPECIAL_BASE.name)} style={{
              width: '100%', textAlign: 'right', padding: '10px 14px', borderRadius: 10,
              background: currentCity === SPECIAL_BASE.name ? '#15803d' : '#dcfce7',
              color: currentCity === SPECIAL_BASE.name ? 'white' : '#15803d',
              fontSize: 14, fontWeight: 700, marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 8,
              border: 'none', cursor: 'pointer',
            }}>
              {currentCity === SPECIAL_BASE.name && <span>✓</span>}
              <span>🪖 {SPECIAL_BASE.name}</span>
            </button>
          </div>
        )}

        {/* רשימת ישובים */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 16px' }}>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            {filtered.map(l => (
              <button key={l.name} onClick={() => handleSelect(l.name)} style={{
                width: '100%', textAlign: 'right', padding: '10px 14px',
                borderBottom: '1px solid #f1f5f9', background: currentCity === l.name ? '#eff6ff' : 'white',
                color: currentCity === l.name ? '#1e40af' : '#1e293b',
                fontWeight: currentCity === l.name ? 700 : 400,
                fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                border: 'none', cursor: 'pointer',
              }}>
                <span>📍 {l.name}</span>
                {currentCity === l.name && <span style={{ color: '#3b82f6' }}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
