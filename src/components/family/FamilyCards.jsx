import { useState, useEffect, useRef } from 'react'
import { getStatus } from '../../data/statusConfig'
import { alertLevelConfig } from '../../data/familyData'
import { LOCALITIES, localityCoords, SPECIAL_BASE } from '../../data/israeliLocalities'

const LOCALITIES_SORTED = [...LOCALITIES].sort((a, b) => a.name.localeCompare(b.name, 'he'))

// ────────────────────────────────────────────────────────────
// פיקר מיקום מוטבע
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
      <div style={{ maxHeight: 180, overflowY: 'auto' }}>
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
// סטטיסטיקות אזעקות
// ────────────────────────────────────────────────────────────
function AlertStat({ label, count, color, bg }) {
  if (count === null) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 3,
      background: count > 0 ? bg : '#f1f5f9',
      color: count > 0 ? color : '#94a3b8',
      fontSize: 11, padding: '2px 8px', borderRadius: 20,
      fontWeight: count > 0 ? 700 : 400,
    }}>
      <span>{count > 0 ? '🚨' : '✅'}</span>
      <span>{label}:</span>
      <span>{count > 0 ? count : 'ללא'}</span>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// כרטיס מבוגר
// ────────────────────────────────────────────────────────────
export function MemberCard({ member, city, shelter, photo, statusKey, alertData, editingId, onToggleEdit, onSelectLocation }) {
  const status    = getStatus(statusKey)
  const inShelter = shelter[member.id]?.active
  const isEditing = editingId === member.id

  const todayAlerts     = alertData.today?.[city]?.alerts     ?? null
  const yesterdayAlerts = alertData.yesterday?.[city]?.alerts ?? null
  const weekAlerts      = alertData.week?.[city]?.alerts      ?? null

  const todayLevel = todayAlerts > 0
    ? alertLevelConfig[alertData.today[city].level]
    : null

  return (
    <div style={{
      background: 'white',
      borderRadius: 14,
      padding: '12px 14px',
      boxShadow: isEditing ? '0 0 0 2px #3b82f6' : inShelter ? '0 0 0 2px #dc2626' : '0 1px 4px rgba(0,0,0,0.07)',
      marginBottom: 10,
      position: 'relative',
      overflow: isEditing ? 'visible' : 'hidden',
    }}>
      {inShelter && (
        <div style={{
          position: 'absolute', top: 0, right: 0, left: 0,
          height: 3,
          background: 'linear-gradient(90deg, #dc2626, #ef4444)',
          borderRadius: '14px 14px 0 0',
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: inShelter ? '#fee2e2' : member.military ? '#dcfce7' : '#eff6ff',
            border: inShelter ? '2px solid #dc2626' : member.military ? '2px solid #16a34a' : '2px solid #bfdbfe',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, overflow: 'hidden',
          }}>
            {photo
              ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : member.emoji
            }
          </div>
          {member.military && !inShelter && (
            <span style={{ position: 'absolute', bottom: -2, left: -2, fontSize: 13 }}>🪖</span>
          )}
          {inShelter && (
            <span className="shelter-pulse" style={{
              position: 'absolute', bottom: -2, left: -2,
              fontSize: 14, background: 'white', borderRadius: '50%', lineHeight: 1,
            }}>🚨</span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{member.name}</span>
            <span style={{
              fontSize: 10, padding: '2px 7px', borderRadius: 20,
              background: member.military ? '#dcfce7' : '#eff6ff',
              color: member.military ? '#15803d' : '#1e40af', fontWeight: 600,
            }}>
              {member.role}
            </span>
            {status && (
              <span style={{ background: status.bg, color: status.color, fontSize: 10, padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>
                {status.icon} {status.label}
              </span>
            )}
          </div>

          {inShelter ? (
            <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 700, marginTop: 2 }}>
              🚨 במקלט כרגע
            </div>
          ) : (
            <>
              <button
                onClick={() => onToggleEdit(member.id)}
                style={{
                  fontSize: 12, marginTop: 4,
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: isEditing ? '#eff6ff' : 'transparent',
                  color: isEditing ? '#1e40af' : '#64748b',
                  padding: isEditing ? '2px 8px' : '2px 0',
                  borderRadius: 8, fontWeight: isEditing ? 700 : 400,
                  border: isEditing ? '1px solid #bfdbfe' : '1px solid transparent',
                  cursor: 'pointer',
                }}
              >
                <span>📍</span>
                <span>{city || 'הגדר מיקום'}</span>
                <span style={{ fontSize: 10, opacity: 0.6 }}>{isEditing ? '▲' : '✏️'}</span>
                {todayLevel && !isEditing && (
                  <span style={{
                    background: todayLevel.bg, color: todayLevel.color,
                    fontSize: 10, padding: '1px 6px', borderRadius: 10, fontWeight: 700,
                  }}>
                    {todayLevel.icon} {todayLevel.label}
                  </span>
                )}
              </button>

              {city && !isEditing && (
                <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                  <AlertStat label="היום" count={todayAlerts} color="#dc2626" bg="#fee2e2" />
                  <AlertStat label="אתמול" count={yesterdayAlerts} color="#d97706" bg="#fef3c7" />
                  <AlertStat label="שבוע" count={weekAlerts} color="#7c3aed" bg="#ede9fe" />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {isEditing && (
        <InlineLocationPicker
          person={member}
          currentCity={city}
          onSelect={(id, loc) => { onSelectLocation(id, loc); onToggleEdit(null) }}
          onClose={() => onToggleEdit(null)}
        />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// כרטיס נכד
// ────────────────────────────────────────────────────────────
export function GrandchildCard({ child, city, shelter, photo, alertData, editingId, onToggleEdit, onSelectLocation }) {
  const inShelter   = shelter[child.id]?.active
  const todayAlerts = alertData.today?.[city]?.alerts ?? null
  const isEditing   = editingId === child.id

  return (
    <div style={{
      background: 'white', borderRadius: 12,
      padding: '12px 10px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
      boxShadow: isEditing ? '0 0 0 2px #3b82f6' : inShelter ? '0 0 0 2px #dc2626' : '0 1px 4px rgba(0,0,0,0.07)',
      position: 'relative',
    }}>
      {inShelter && (
        <div style={{ position: 'absolute', top: 0, right: 0, left: 0, height: 3, background: '#dc2626', borderRadius: '12px 12px 0 0' }} />
      )}
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        background: inShelter ? '#fee2e2' : '#fef3c7',
        border: inShelter ? '2px solid #dc2626' : '2px solid #fbbf24',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, overflow: 'hidden',
      }}>
        {photo
          ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : child.emoji
        }
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', textAlign: 'center', lineHeight: 1.3 }}>{child.name}</span>
      <span style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', lineHeight: 1.2 }}>{child.parents}</span>

      <button
        onClick={() => onToggleEdit(child.id)}
        style={{
          fontSize: 10, padding: '3px 8px', borderRadius: 8,
          background: isEditing ? '#eff6ff' : '#f1f5f9',
          color: isEditing ? '#1e40af' : '#64748b',
          border: isEditing ? '1px solid #bfdbfe' : '1px solid transparent',
          display: 'flex', alignItems: 'center', gap: 3,
          cursor: 'pointer',
        }}
      >
        <span>📍</span>
        <span>{city || 'הגדר מיקום'}</span>
        <span style={{ opacity: 0.5 }}>{isEditing ? '▲' : '✏️'}</span>
      </button>

      {todayAlerts !== null && todayAlerts > 0 && !isEditing && (
        <span style={{ fontSize: 10, color: '#dc2626', fontWeight: 700 }}>🚨 {todayAlerts} היום</span>
      )}
      {inShelter && <span className="shelter-pulse" style={{ fontSize: 12 }}>🚨</span>}

      {isEditing && (
        <div style={{ width: '100%', position: 'relative', zIndex: 10 }}>
          <InlineLocationPicker
            person={child}
            currentCity={city}
            onSelect={(id, loc) => { onSelectLocation(id, loc); onToggleEdit(null) }}
            onClose={() => onToggleEdit(null)}
          />
        </div>
      )}
    </div>
  )
}
