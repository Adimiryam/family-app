import { useState } from 'react'
import { alertLevelConfig } from '../../data/familyData'
import { getStatus } from '../../data/statusConfig'
import { normalizeCity } from '../../services/pikudHaoref'
import InlineLocationPicker from './InlineLocationPicker'

export default function FamilyList({ members, kids, cityAlertData, shelter, photos, statuses, editingId, setEditingId, handleInlineLocationSelect, setShowEdit, alertsUser, alertsFamily, currentUserCity, loading, shelterTimeLabelUser, shelterTimeLabelFamily, periodLabel, securityLevel, dataRangeLabel, onScroll, onMemberClick, focusedMemberId, scrollRef, currentUserId }) {
  const [viewMode, setViewMode] = useState('user')

  const isFamily = viewMode === 'family'
  const alertsValue = isFamily ? (alertsFamily || '0') : (alertsUser || '0')
  const alertsLabel = isFamily ? `אזעקות כל המשפחה` : (currentUserCity ? `אזעקות ב${currentUserCity}` : 'אזעקות')
  const shelterValue = isFamily ? shelterTimeLabelFamily : shelterTimeLabelUser
  const shelterLabel = `זמן בממ"ד ${periodLabel}`

  const renderMemberCard = (member, isKid = false) => {
    const nc = normalizeCity(member.city)
    const cityData  = cityAlertData[nc] || { alerts: 0, level: 'low' }
    const cfg       = alertLevelConfig[cityData.level]
    const inShelter = shelter[member.id]?.active
    const photo     = photos[member.id]
    const status    = !isKid ? getStatus(statuses[member.id]) : null
    const isMe      = member.id === currentUserId
    const isEditing = editingId === member.id
    const isFocused = focusedMemberId === member.id

    return (
      <div key={member.id}>
        <div
          onClick={() => onMemberClick && onMemberClick(member)}
          style={{
            background: isFocused ? '#eff6ff' : 'white',
            borderRadius: 11,
            padding: '10px 12px',
            marginBottom: isEditing ? 0 : 7,
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: inShelter ? '0 0 0 2px #dc2626' : isFocused ? '0 0 0 2px #3b82f6' : '0 1px 3px rgba(0,0,0,0.06)',
            border: isEditing ? '2px solid #3b82f6' : isFocused ? '2px solid #3b82f6' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: inShelter ? '#fee2e2' : isKid ? '#fef3c7' : '#f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, overflow: 'hidden',
            border: inShelter ? '2px solid #dc2626' : isKid ? '2px solid #fcd34d' : '2px solid #e2e8f0',
            flexShrink: 0,
          }}>
            {photo ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : member.emoji}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
              {member.name}
              {member.military && <span style={{ marginRight: 4, fontSize: 11 }}>🪖</span>}
              {isMe && <span style={{ marginRight: 4, fontSize: 10, color: '#3b82f6', fontWeight: 800 }}>(אני)</span>}
            </div>
            {isKid && member.parents && (
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{member.parents}</div>
            )}
            {inShelter
              ? <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }}>🚨 במקלט כרגע!</div>
              : member.city
                ? <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                    <span>📍 {member.city}</span>
                    {isMe && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingId(isEditing ? null : member.id) }}
                        style={{ fontSize: 10, color: '#3b82f6', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '1px 6px', cursor: 'pointer', fontWeight: 700 }}
                      >
                        {isEditing ? '▲ סגור' : '✏️ שנה'}
                      </button>
                    )}
                    {status && (
                      <span style={{ background: status.bg, color: status.color, padding: '1px 6px', borderRadius: 8, fontWeight: 700, fontSize: 10 }}>
                        {status.icon} {status.label}
                      </span>
                    )}
                  </div>
                : isMe
                  ? <button onClick={(e) => { e.stopPropagation(); setEditingId(member.id) }} style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, background: 'none', padding: 0, textDecoration: 'underline', border: 'none', cursor: 'pointer' }}>
                      📍 הגדר מיקום
                    </button>
                  : <div style={{ fontSize: 11, color: '#94a3b8' }}>📍 מיקום לא הוגדר</div>
            }
          </div>
          {member.city && !isEditing
            ? <div style={{ background: cfg.bg, color: cfg.color, fontSize: 10, padding: '2px 8px', borderRadius: 16, fontWeight: 700 }}>
                {cfg.icon} {cfg.label}
              </div>
            : null
          }
        </div>

        {/* פרטי מיקום מורחבים בלחיצה */}
        {isFocused && member.city && !isEditing && (
          <div style={{
            background: '#f0f7ff', borderRadius: '0 0 11px 11px',
            padding: '10px 14px', marginBottom: 7, marginTop: -2,
            border: '2px solid #3b82f6', borderTop: '1px dashed #93c5fd',
          }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ background: 'white', borderRadius: 8, padding: '6px 12px', flex: 1, minWidth: 80, textAlign: 'center' }}>
                <div style={{ fontSize: 16 }}>🚨</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#dc2626' }}>{cityData.alerts || 0}</div>
                <div style={{ fontSize: 9, color: '#64748b' }}>אזעקות ב{member.city}</div>
              </div>
              <div style={{ background: 'white', borderRadius: 8, padding: '6px 12px', flex: 1, minWidth: 80, textAlign: 'center' }}>
                <div style={{ fontSize: 16 }}>{cfg.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: cfg.color }}>{cfg.label}</div>
                <div style={{ fontSize: 9, color: '#64748b' }}>רמת סיכון</div>
              </div>
              {cityData.shelterMinutes > 0 && (
                <div style={{ background: 'white', borderRadius: 8, padding: '6px 12px', flex: 1, minWidth: 80, textAlign: 'center' }}>
                  <div style={{ fontSize: 16 }}>🏠</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#7c3aed' }}>{cityData.shelterMinutes}ד'</div>
                  <div style={{ fontSize: 9, color: '#64748b' }}>זמן בממ"ד</div>
                </div>
              )}
            </div>
            {inShelter && (
              <div style={{ marginTop: 8, background: '#fee2e2', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: '#dc2626', fontWeight: 700, textAlign: 'center' }}>
                🚨 {member.name} במקלט כרגע!
              </div>
            )}
          </div>
        )}

        {isEditing && isMe && (
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
  }

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      style={{ flex: 1, overflow: 'auto', padding: '12px 14px' }}
    >

      {/* כפתור מעבר בין מצבים */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 0,
        marginBottom: 10, borderRadius: 10, overflow: 'hidden',
        border: '1.5px solid #e2e8f0',
      }}>
        <button
          onClick={() => setViewMode('user')}
          style={{
            flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 700,
            background: !isFamily ? '#1e40af' : 'white',
            color: !isFamily ? 'white' : '#64748b',
            border: 'none', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          📍 המיקום שלי
        </button>
        <button
          onClick={() => setViewMode('family')}
          style={{
            flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 700,
            background: isFamily ? '#1e40af' : 'white',
            color: isFamily ? 'white' : '#64748b',
            border: 'none', cursor: 'pointer',
            borderRight: '1.5px solid #e2e8f0',
            transition: 'all 0.2s',
          }}
        >
          👨‍👩‍👧 כל המשפחה
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
        {[
          { label: alertsLabel, value: loading ? '—' : alertsValue, icon: '🚨', color: '#dc2626', bg: '#fee2e2' },
          { label: shelterLabel, value: loading ? 'טוען...' : shelterValue, icon: '🏠', color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'מדד בטחון',   value: securityLevel.label, icon: securityLevel.icon, color: securityLevel.color, bg: securityLevel.bg },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 18 }}>{s.icon}</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 9, color: s.color, opacity: 0.8 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {dataRangeLabel && (
        <div style={{ textAlign: 'center', fontSize: 10, color: '#94a3b8', marginBottom: 10, fontWeight: 600 }}>
          📊 {dataRangeLabel}
        </div>
      )}

      <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 8 }}>לחץ על בן משפחה למיקוד במפה</div>

      {members.map(member => renderMemberCard(member, false))}

      <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, margin: '12px 0 8px' }}>הנכדים האהובים</div>
      {kids.map(child => renderMemberCard(child, true))}
    </div>
  )
}
