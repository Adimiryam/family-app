import { useState, useEffect, useRef } from 'react'
import { useUser } from '../App'
import { familyMembers, grandchildren, alertLevelConfig, initialAchievements } from '../data/familyData'
import { fetchAlertsByPeriod } from '../services/pikudHaoref'
import { getStatus } from '../data/statusConfig'
import { LOCALITIES, localityCoords, SPECIAL_BASE } from '../data/israeliLocalities'

const LOCALITIES_SORTED = [...LOCALITIES].sort((a, b) => a.name.localeCompare(b.name, 'he'))
const MESSAGE_COLORS = ['#ec4899', '#3b82f6', '#16a34a', '#7c3aed', '#f59e0b', '#dc2626', '#14b8a6', '#eab308']

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
// כרטיס מבוגר
// ────────────────────────────────────────────────────────────
function MemberCard({ member, city, shelter, photo, statusKey, alertData, editingId, onToggleEdit, onSelectLocation }) {
  const status    = getStatus(statusKey)
  const inShelter = shelter[member.id]?.active
  const isEditing = editingId === member.id

  const todayAlerts     = alertData.today?.[city]?.alerts     ?? null
  const yesterdayAlerts = alertData.yesterday?.[city]?.alerts ?? null
  const weekAlerts      = alertData.week?.[city]?.alerts      ?? null

  // רמת סכנה לפי היום
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
      {/* פס מקלט */}
      {inShelter && (
        <div style={{
          position: 'absolute', top: 0, right: 0, left: 0,
          height: 3,
          background: 'linear-gradient(90deg, #dc2626, #ef4444)',
          borderRadius: '14px 14px 0 0',
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* תמונה / אמוג'י */}
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

        {/* פרטים */}
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
              {/* מיקום — לחיץ לעריכה */}
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

              {/* סטטיסטיקות אזעקות */}
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

      {/* פיקר מיקום מוטבע */}
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
// כרטיס נכד
// ────────────────────────────────────────────────────────────
function GrandchildCard({ child, city, shelter, photo, alertData, editingId, onToggleEdit, onSelectLocation }) {
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

      {/* מיקום — לחיץ לעריכה */}
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

      {/* פיקר מיקום מוטבע */}
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

function AchievementModal({ onClose, onSave, currentUser, initial }) {
  const [text, setText] = useState(initial?.text || '')
  const handleSubmit = () => {
    if (!text.trim()) return
    if (initial) {
      onSave({ ...initial, text })
    } else {
      onSave({
        id: Date.now(), text, author: currentUser?.name || 'אנונימי',
        likes: [], createdAt: new Date().toLocaleDateString('he-IL'),
      })
    }
    onClose()
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '24px 20px', width: '100%', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>{initial ? '✏️ ערוך הישג' : '🏆 הישג חדש'}</h2>
          <button onClick={onClose} style={{ fontSize: 22, background: 'none', color: '#94a3b8', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="נווה נגמלה מחיתולים! 🎉" rows={3}
          style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 15, resize: 'none', direction: 'rtl' }} />
        <button onClick={handleSubmit} style={{
          width: '100%', padding: '14px', borderRadius: 12, marginTop: 16,
          background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', fontSize: 16, fontWeight: 700, border: 'none', cursor: 'pointer',
        }}>{initial ? 'שמור שינויים ✅' : 'פרסם 🏆'}</button>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// מודל הוספת הודעה
// ────────────────────────────────────────────────────────────
function MessageModal({ onClose, onSave, currentUser }) {
  const [text, setText] = useState('')
  const [color, setColor] = useState(MESSAGE_COLORS[0])

  const handleSubmit = () => {
    if (!text.trim()) return
    onSave({
      id: Date.now(),
      text,
      author: currentUser?.name || 'אנונימי',
      color,
      likes: [],
      replies: [],
      createdAt: new Date().toLocaleDateString('he-IL'),
    })
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '24px 20px', width: '100%', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>✍️ הוסף הודעה</h2>
          <button onClick={onClose} style={{ fontSize: 22, background: 'none', color: '#94a3b8', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="כתוב משהו למשפחה..." rows={3}
          style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 15, resize: 'none', direction: 'rtl', marginBottom: 14 }} />
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>בחר צבע:</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {MESSAGE_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{
                width: 36, height: 36, borderRadius: '50%',
                background: c,
                border: color === c ? '3px solid #1e293b' : '2px solid transparent',
                cursor: 'pointer',
              }} />
            ))}
          </div>
        </div>
        <button onClick={handleSubmit} style={{
          width: '100%', padding: '14px', borderRadius: 12,
          background: 'linear-gradient(135deg, #3b82f6, #1e40af)', color: 'white', fontSize: 16, fontWeight: 700, border: 'none', cursor: 'pointer',
        }}>שלח 📤</button>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// כרטיס הודעה
// ────────────────────────────────────────────────────────────
function MessageCard({ message, currentUser, onLike, onReply, onDelete }) {
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [replyText, setReplyText] = useState('')
  const liked = message.likes?.includes(currentUser?.name)

  const handleAddReply = () => {
    if (!replyText.trim()) return
    onReply(message.id, {
      id: Date.now(),
      text: replyText,
      author: currentUser?.name || 'אנונימי',
    })
    setReplyText('')
    setShowReplyInput(false)
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: 12,
      marginBottom: 10,
      overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
      borderLeft: `4px solid ${message.color}`,
    }}>
      {/* תוכן הודעה */}
      <div style={{ padding: '14px 14px 10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{message.author}</span>
          {currentUser?.name === message.author && (
            <button onClick={() => onDelete(message.id)} style={{
              fontSize: 14, background: 'none', border: 'none', color: '#94a3b8',
              cursor: 'pointer', padding: '2px 6px',
            }}>🗑️</button>
          )}
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>{message.createdAt}</div>
        <p style={{ fontSize: 14, color: '#1e293b', margin: '0 0 10px 0', lineHeight: 1.4 }}>{message.text}</p>

        {/* כפתורים */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => onLike(message.id)} style={{
            display: 'flex', alignItems: 'center', gap: 3,
            padding: '4px 10px', borderRadius: 8, fontSize: 11,
            background: liked ? '#fef2f2' : '#f1f5f9',
            color: liked ? '#dc2626' : '#94a3b8',
            border: liked ? '1px solid #fca5a5' : '1px solid #e2e8f0',
            cursor: 'pointer', fontWeight: liked ? 700 : 400,
          }}>
            <span>{liked ? '❤️' : '🤍'}</span>
            <span>{message.likes?.length || 0}</span>
          </button>
          <button onClick={() => setShowReplyInput(!showReplyInput)} style={{
            display: 'flex', alignItems: 'center', gap: 3,
            padding: '4px 10px', borderRadius: 8, fontSize: 11,
            background: showReplyInput ? '#eff6ff' : '#f1f5f9',
            color: showReplyInput ? '#1e40af' : '#94a3b8',
            border: showReplyInput ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
            cursor: 'pointer', fontWeight: showReplyInput ? 700 : 400,
          }}>
            💬 {message.replies?.length || 0}
          </button>
        </div>

        {/* הצגת likes */}
        {message.likes?.length > 0 && (
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6 }}>
            {message.likes.join(', ')} אהבו
          </div>
        )}
      </div>

      {/* תיבת תגובה */}
      {showReplyInput && (
        <div style={{ padding: '0 14px 10px', borderTop: '1px solid #f1f5f9' }}>
          <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="כתוב תגובה..." style={{
            width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0',
            fontSize: 12, marginBottom: 8, direction: 'rtl',
          }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleAddReply} style={{
              flex: 1, padding: '6px 10px', borderRadius: 8, background: '#1e40af', color: 'white',
              fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer',
            }}>שלח</button>
            <button onClick={() => { setShowReplyInput(false); setReplyText('') }} style={{
              flex: 1, padding: '6px 10px', borderRadius: 8, background: '#f1f5f9', color: '#475569',
              fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer',
            }}>ביטול</button>
          </div>
        </div>
      )}

      {/* תגובות */}
      {message.replies?.length > 0 && (
        <div style={{ padding: '0 14px 10px', borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
          {message.replies.map(reply => (
            <div key={reply.id} style={{
              padding: '8px 10px', marginTop: 8, background: 'white', borderRadius: 8,
              borderRight: `2px solid ${message.color}`, opacity: 0.9,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>{reply.author}</div>
              <div style={{ fontSize: 12, color: '#475569' }}>{reply.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// מסך משפחה
// ────────────────────────────────────────────────────────────
export default function FamilyScreen() {
  const { currentUser, shelter, photos, statuses, locations, saveLocations } = useUser()
  const [tab, setTab]           = useState('adults')
  const [alertData, setAlertData] = useState({ today: {}, yesterday: {}, week: {} })
  const [loading, setLoading]   = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [achievements, setAchievements] = useState(() => {
    try {
      const saved = localStorage.getItem('familyapp_achievements')
      return saved ? JSON.parse(saved) : initialAchievements
    } catch { return initialAchievements }
  })
  const [showAchievementModal, setShowAchievementModal] = useState(false)
  const [editAchievement, setEditAchievement] = useState(null)

  // Messages state
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem('familyapp_messages') || '[]') } catch { return [] }
  })
  const [showMessageModal, setShowMessageModal] = useState(false)

  const saveMessages = (updated) => {
    setMessages(updated)
    try { localStorage.setItem('familyapp_messages', JSON.stringify(updated)) } catch {}
  }

  const saveAchievements = (updated) => {
    setAchievements(updated)
    try { localStorage.setItem('familyapp_achievements', JSON.stringify(updated)) } catch {}
  }

  const handleToggleEdit = (id) => setEditingId(prev => prev === id ? null : id)

  const handleSelectLocation = (memberId, locData) => {
    saveLocations({ ...locations, [memberId]: locData })
  }

  const handleLikeMessage = (messageId) => {
    const updated = messages.map(m => {
      if (m.id !== messageId) return m
      const liked = m.likes?.includes(currentUser?.name)
      return {
        ...m,
        likes: liked ? m.likes.filter(n => n !== currentUser?.name) : [...(m.likes || []), currentUser?.name]
      }
    })
    saveMessages(updated)
  }

  const handleReplyMessage = (messageId, reply) => {
    const updated = messages.map(m => {
      if (m.id !== messageId) return m
      return {
        ...m,
        replies: [...(m.replies || []), reply]
      }
    })
    saveMessages(updated)
  }

  const handleDeleteMessage = (messageId) => {
    if (window.confirm('למחוק את ההודעה?')) {
      saveMessages(messages.filter(m => m.id !== messageId))
    }
  }

  const defenders = familyMembers.filter(m => locations[m.id]?.city === 'בסיס כלשהו')
  const nonDefenders = familyMembers.filter(m => locations[m.id]?.city !== 'בסיס כלשהו')
  const shelterCount = Object.values(shelter).filter(s => s.active).length

  // שליפת נתוני אזעקות מפיקוד העורף
  useEffect(() => {
    async function load() {
      setLoading(true)
      const [today, yesterday, week] = await Promise.all([
        fetchAlertsByPeriod('today'),
        fetchAlertsByPeriod('yesterday'),
        fetchAlertsByPeriod('week'),
      ])
      setAlertData({
        today:     today.data     || {},
        yesterday: yesterday.data || {},
        week:      week.data      || {},
      })
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* כותרת */}
      <div style={{
        background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
        padding: '16px 16px 12px', color: 'white',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>👨‍👩‍👧‍👦 המשפחה שלנו</h1>
          <p style={{ fontSize: 12, opacity: 0.85 }}>
            {familyMembers.length} מבוגרים · {grandchildren.length} נכדים
            {loading ? ' · טוען נתוני אזעקות...' : ' · נתוני פיקוד העורף'}
          </p>
        </div>
        {shelterCount > 0 && (
          <div className="shelter-pulse" style={{
            background: '#dc2626', color: 'white',
            padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800,
          }}>
            🚨 {shelterCount} במקלט
          </div>
        )}
      </div>

      {/* טאבים */}
      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 16px' }}>
        {[
          { key: 'adults',       label: '👨‍👩‍👧 מבוגרים' },
          { key: 'grandchildren',label: '🧒 נכדים' },
          { key: 'achievements', label: '🏆 הישגים' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '12px 16px', background: 'none',
            borderBottom: tab === t.key ? '2px solid #1e40af' : '2px solid transparent',
            color: tab === t.key ? '#1e40af' : '#64748b',
            fontSize: 14, fontWeight: tab === t.key ? 700 : 400, marginBottom: -1,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* תוכן */}
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 14px 8px' }}>
        {tab === 'adults' ? (
          <>
            {defenders.length > 0 && (
              <>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 10, padding: '8px 12px',
                  background: '#dcfce7', borderRadius: 10, border: '1px solid #bbf7d0',
                }}>
                  <span style={{ fontSize: 18 }}>🪖</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>מגני המדינה</div>
                    <div style={{ fontSize: 11, color: '#16a34a' }}>
                      {defenders.map(m => m.name).join(' ו-')} — גאים בכם! 💚
                    </div>
                  </div>
                </div>
                {defenders.map(m => (
                  <MemberCard
                    key={m.id} member={m}
                    city={locations[m.id]?.city || null}
                    shelter={shelter} photo={photos[m.id]}
                    statusKey={statuses[m.id]}
                    alertData={alertData}
                    editingId={editingId}
                    onToggleEdit={handleToggleEdit}
                    onSelectLocation={handleSelectLocation}
                  />
                ))}
                <div style={{ height: 6 }} />
              </>
            )}
            {nonDefenders.map(m => (
              <MemberCard
                key={m.id} member={m}
                city={locations[m.id]?.city || null}
                shelter={shelter} photo={photos[m.id]}
                statusKey={statuses[m.id]}
                alertData={alertData}
                editingId={editingId}
                onToggleEdit={handleToggleEdit}
                onSelectLocation={handleSelectLocation}
              />
            ))}
          </>
        ) : (
          <>
            <div style={{
              padding: '8px 12px', background: '#fef3c7', borderRadius: 10,
              border: '1px solid #fde68a', marginBottom: 14, textAlign: 'center',
            }}>
              <span style={{ fontSize: 14, color: '#92400e', fontWeight: 600 }}>
                ✨ {grandchildren.length} הנכדים האהובים שלנו!
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {grandchildren.map(child => (
                <GrandchildCard
                  key={child.id} child={child}
                  city={locations[child.id]?.city || null}
                  shelter={shelter} photo={photos[child.id]}
                  alertData={alertData}
                  editingId={editingId}
                  onToggleEdit={handleToggleEdit}
                  onSelectLocation={handleSelectLocation}
                />
              ))}
            </div>
            {/* עוברים בדרך */}
            {(() => {
              const unbornKids = grandchildren.filter(c => c.unborn && c.dueDate)
              if (unbornKids.length === 0) return null
              const today = new Date()
              return (
                <div style={{ marginTop: 16 }}>
                  <div style={{ padding: '8px 12px', background: '#fce7f3', borderRadius: 10, border: '1px solid #fbcfe8', marginBottom: 10, textAlign: 'center' }}>
                    <span style={{ fontSize: 14, color: '#9d174d', fontWeight: 600 }}>🤰 בדרך אלינו!</span>
                  </div>
                  {unbornKids.map(baby => {
                    const due = new Date(baby.dueDate)
                    const PREG = 280
                    const conception = new Date(due.getTime() - PREG * 86400000)
                    const elapsed = Math.floor((today - conception) / 86400000)
                    const progress = Math.min(100, Math.max(0, Math.round((elapsed / PREG) * 100)))
                    const weeks = Math.floor(elapsed / 7)
                    const months = Math.round(weeks / 4.33)
                    const daysLeft = Math.max(0, Math.floor((due - today) / 86400000))
                    return (
                      <div key={baby.id} style={{ background: 'white', borderRadius: 14, padding: '14px 16px', marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <span style={{ fontSize: 28 }}>{baby.emoji}</span>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{baby.name}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{baby.parents}</div>
                          </div>
                          <div style={{ marginRight: 'auto', textAlign: 'center' }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: '#ec4899' }}>{progress}%</div>
                            <div style={{ fontSize: 9, color: '#94a3b8' }}>טעינה</div>
                          </div>
                        </div>
                        <div style={{ background: '#f1f5f9', borderRadius: 10, height: 16, overflow: 'hidden', marginBottom: 6 }}>
                          <div style={{ height: '100%', borderRadius: 10, background: progress > 80 ? 'linear-gradient(90deg, #ec4899, #f43f5e)' : 'linear-gradient(90deg, #f9a8d4, #ec4899)', width: progress + '%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'white', fontWeight: 700 }}>
                            {progress > 15 ? progress + '%' : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b' }}>
                          <span>שבוע {weeks} (חודש {months})</span>
                          <span>עוד {daysLeft} ימים!</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </>
        ) : tab === 'achievements' ? (
          <>
            <button onClick={() => { setEditAchievement(null); setShowAchievementModal(true) }}
              style={{ width: '100%', padding: '12px', borderRadius: 12, marginBottom: 14,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
              ➕ הוסף הישג חדש
            </button>
            {achievements.map(ach => {
              const liked = ach.likes?.includes(currentUser?.name)
              return (
                <div key={ach.id} style={{ background: 'white', borderRadius: 14, padding: '14px 16px', marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', flex: 1 }}>{ach.text}</p>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => { setEditAchievement(ach); setShowAchievementModal(true) }}
                        style={{ width: 28, height: 28, borderRadius: 8, background: '#f1f5f9', fontSize: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏️</button>
                      <button onClick={() => { if (window.confirm('למחוק?')) saveAchievements(achievements.filter(a => a.id !== ach.id)) }}
                        style={{ width: 28, height: 28, borderRadius: 8, background: '#fef2f2', fontSize: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑️</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>✍️ {ach.author} · {ach.createdAt}</span>
                    <button onClick={() => {
                        const updatedLikes = liked ? (ach.likes || []).filter(n => n !== currentUser?.name) : [...(ach.likes || []), currentUser?.name]
                        saveAchievements(achievements.map(a => a.id === ach.id ? { ...a, likes: updatedLikes } : a))
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 20,
                        background: liked ? '#fef2f2' : '#f1f5f9', color: liked ? '#dc2626' : '#94a3b8',
                        fontSize: 13, fontWeight: liked ? 700 : 400, border: liked ? '1px solid #fca5a5' : '1px solid #e2e8f0', cursor: 'pointer' }}>
                      <span>{liked ? '❤️' : '🤍'}</span><span>{ach.likes?.length || 0}</span>
                    </button>
                  </div>
                  {ach.likes?.length > 0 && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{ach.likes.join(', ')} אהבו</div>}
                </div>
              )
            })}
          </>
        ) : null}

        {/* קיר המשפחה - הודעות */}
        <div style={{ marginTop: 20, paddingBottom: 20, borderTop: '2px solid #e2e8f0', paddingTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: 0 }}>📝 קיר המשפחה</h2>
            <button onClick={() => setShowMessageModal(true)} style={{
              marginRight: 'auto', padding: '6px 12px', borderRadius: 8,
              background: '#3b82f6', color: 'white', fontSize: 12, fontWeight: 700,
              border: 'none', cursor: 'pointer',
            }}>➕ הוסף הודעה</button>
          </div>

          {messages.length === 0 ? (
            <div style={{
              padding: '20px', textAlign: 'center', background: '#f8fafc',
              borderRadius: 12, color: '#94a3b8', fontSize: 13,
            }}>
              אין הודעות עדיין. היו הראשונים להוסיף משהו! 🎉
            </div>
          ) : (
            messages.map(msg => (
              <MessageCard
                key={msg.id}
                message={msg}
                currentUser={currentUser}
                onLike={handleLikeMessage}
                onReply={handleReplyMessage}
                onDelete={handleDeleteMessage}
              />
            ))
          )}
        </div>
      </div>

      {showAchievementModal && (
        <AchievementModal
          onClose={() => { setShowAchievementModal(false); setEditAchievement(null) }}
          onSave={(item) => {
            if (editAchievement) {
              saveAchievements(achievements.map(a => a.id === item.id ? item : a))
            } else {
              saveAchievements([item, ...achievements])
            }
          }}
          currentUser={currentUser}
          initial={editAchievement}
        />
      )}

      {showMessageModal && (
        <MessageModal
          onClose={() => setShowMessageModal(false)}
          onSave={(msg) => saveMessages([msg, ...messages])}
          currentUser={currentUser}
        />
      )}
    </div>
  )
}