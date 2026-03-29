import { useState } from 'react'
import { LOCALITIES_SORTED } from '../../utils/mapUtils'
import { localityCoords, SPECIAL_BASE } from '../../data/israeliLocalities'
import { alertLevelConfig } from '../../data/familyData'

export default function EditLocationsModal({ allPeople, locations, onSave, onClose, cityAlertData }) {
  const [draft, setDraft]       = useState({ ...locations })
  const [tab, setTab]           = useState('adults')
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch]     = useState('')

  const adults      = allPeople.filter(p => !p.isGrandchild)
  const kiddos      = allPeople.filter(p => p.isGrandchild && !p.isUnborn)
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