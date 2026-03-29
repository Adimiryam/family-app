import { alertLevelConfig } from '../../data/familyData'
import { getStatus } from '../../data/statusConfig'
import InlineLocationPicker from './InlineLocationPicker'

export default function FamilyList({ members, kids, cityAlertData, shelter, photos, statuses, editingId, setEditingId, handleInlineLocationSelect, setShowEdit, totalAlertsToday, todayLoaded, shelterTimeLabel, securityLevel }) {
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'אזעקות היום', value: totalAlertsToday || (todayLoaded ? '0' : '—'), icon: '🚨', color: '#dc2626', bg: '#fee2e2' },
          { label: 'ממד 24שֳ', value: shelterTimeLabel, icon: '🏠', color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'מדד בטחון',   value: securityLevel.label, icon: securityLevel.icon, color: securityLevel.color, bg: securityLevel.bg },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 18 }}>{s.icon}</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: s.color, opacity: 0.8 }}>{s.label}</div>
          </div>
        ))}
      </div>


      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>מצב בטחוני לפי בני משפחה</div>
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
  )
}