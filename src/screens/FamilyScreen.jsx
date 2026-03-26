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
                {isEditing ? '✏️ בחר עיר' : `📍 ${city}`}
              </button>

              {isEditing && (
                <InlineLocationPicker
                  person={member}
                  currentCity={city}
                  onSelect={onSelectLocation}
                  onClose={() => onToggleEdit(null)}
                />
              )}

              {/* הערות אזהרה */}
              {todayLevel && (
                <div style={{ fontSize: 11, color: todayLevel.color, fontWeight: 600, marginTop: 4 }}>
                  {todayLevel.icon} {todayLevel.label} היום
                </div>
              )}
            </>
          )}
        </div>

        {/* דירוגים וסטטוס */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: 22, lineHeight: 1 }}>{member.emoji}</div>
        </div>
      </div>

      {/* סרגל סטטוסטיקה */}
      {todayAlerts !== null && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 6, padding: '4px 8px', fontSize: 11, color: '#64748b', textAlign: 'center' }}>
            <div>היום</div>
            <div style={{ fontWeight: 700, color: '#1e293b' }}>{todayAlerts}</div>
          </div>
          <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 6, padding: '4px 8px', fontSize: 11, color: '#64748b', textAlign: 'center' }}>
            <div>אתמול</div>
            <div style={{ fontWeight: 700, color: '#1e293b' }}>{yesterdayAlerts}</div>
          </div>
          <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 6, padding: '4px 8px', fontSize: 11, color: '#64748b', textAlign: 'center' }}>
            <div>שבוע</div>
            <div style={{ fontWeight: 700, color: '#1e293b' }}>{weekAlerts}</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// קיר מסרים
// ────────────────────────────────────────────────────────────
function MessageWall({ messages, currentUser, onSendMessage, onDeleteMessage, onLikeMessage }) {
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef()
  const containerRef = useRef()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = () => {
    if (!newMessage.trim()) return
    onSendMessage({
      id: Date.now(),
      author: currentUser?.name || 'אנונימי',
      text: newMessage,
      timestamp: new Date().toLocaleTimeString('he-IL'),
      likes: [],
      color: MESSAGE_COLORS[Math.floor(Math.random() * MESSAGE_COLORS.length)],
    })
    setNewMessage('')
  }

  const isLiked = (messageId) => messages.find(m => m.id === messageId)?.likes?.includes(currentUser?.name)

  return (
    <div ref={containerRef} style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#fafafa',
    }}>
      {/* כותרת */}
      <div style={{
        background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
        padding: '16px 16px 12px',
        color: 'white',
        flexShrink: 0,
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>💬 קיר מסרים</h1>
        <p style={{ fontSize: 12, opacity: 0.85 }}>שתפו חדשות והודעות!</p>
      </div>

      {/* הודעות */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💭</div>
            <p>אין הודעות עדיין</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>כתבו משהו!</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} style={{
            background: msg.color,
            borderRadius: 12,
            padding: '10px 12px',
            color: 'white',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            position: 'relative',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{msg.author}</div>
                <div style={{ fontSize: 14, lineHeight: 1.4 }}>{msg.text}</div>
              </div>
              {currentUser?.name === msg.author && (
                <button
                  onClick={() => onDeleteMessage(msg.id)}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: 'white',
                    fontSize: 14,
                    borderRadius: 6,
                    padding: '4px 8px',
                    cursor: 'pointer',
                    marginRight: 8,
                  }}
                >
                  🗑️
                </button>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 11, opacity: 0.8 }}>
              <span>{msg.timestamp}</span>
              <button
                onClick={() => onLikeMessage(msg.id)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: isLiked(msg.id) ? 'gold' : 'white',
                  fontSize: 12,
                  borderRadius: 6,
                  padding: '2px 8px',
                  cursor: 'pointer',
                }}
              >
                {isLiked(msg.id) ? '❤️' : '🤍'} {msg.likes?.length || 0}
              </button>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* שדה הקלדה */}
      <div style={{
        padding: '12px',
        background: 'white',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        gap: 8,
        flexShrink: 0,
      }}>
        <input
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
          placeholder="כתוב הודעה..."
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 10,
            border: '1.5px solid #e2e8f0',
            fontSize: 14,
            direction: 'rtl',
          }}
        />
        <button
          onClick={handleSendMessage}
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
            color: 'white',
            fontSize: 14,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          שלח
        </button>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// המסך הראשי
// ────────────────────────────────────────────────────────────
export default function FamilyScreen() {
  const { currentUser } = useUser()
  const [members, setMembers] = useState(() => {
    const saved = localStorage.getItem('familyMembers')
    return saved ? JSON.parse(saved) : familyMembers
  })
  const [locations, setLocations] = useState(() => {
    const saved = localStorage.getItem('memberLocations')
    return saved ? JSON.parse(saved) : {}
  })
  const [shelter, setShelter] = useState(() => {
    const saved = localStorage.getItem('shelterStatus')
    return saved ? JSON.parse(saved) : {}
  })
  const [alertData, setAlertData] = useState({
    today: {},
    yesterday: {},
    week: {},
  })
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('familyMessages')
    return saved ? JSON.parse(saved) : []
  })
  const [editingId, setEditingId] = useState(null)
  const [achievements, setAchievements] = useState(() => {
    const saved = localStorage.getItem('achievements')
    return saved ? JSON.parse(saved) : initialAchievements
  })
  const [view, setView] = useState('members')

  // טעינת הערות אזהרה לפי עיר
  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const todayData = await fetchAlertsByPeriod('today')
        const yesterdayData = await fetchAlertsByPeriod('yesterday')
        const weekData = await fetchAlertsByPeriod('week')
        setAlertData({
          today: todayData || {},
          yesterday: yesterdayData || {},
          week: weekData || {},
        })
      } catch (err) {
        console.error('Failed to fetch alerts:', err)
      }
    }
    loadAlerts()
    const interval = setInterval(loadAlerts, 60000)
    return () => clearInterval(interval)
  }, [])

  const saveMembers = (updated) => {
    setMembers(updated)
    localStorage.setItem('familyMembers', JSON.stringify(updated))
  }

  const saveLocations = (updated) => {
    setLocations(updated)
    localStorage.setItem('memberLocations', JSON.stringify(updated))
  }

  const saveShelter = (updated) => {
    setShelter(updated)
    localStorage.setItem('shelterStatus', JSON.stringify(updated))
  }

  const saveMessages = (updated) => {
    setMessages(updated)
    localStorage.setItem('familyMessages', JSON.stringify(updated))
  }

  const handleSelectLocation = (personId, locationData) => {
    const updated = { ...locations, [personId]: locationData }
    saveLocations(updated)
  }

  const handleSendMessage = (msg) => {
    saveMessages([...messages, msg])
  }

  const handleDeleteMessage = (id) => {
    saveMessages(messages.filter(m => m.id !== id))
  }

  const handleLikeMessage = (id) => {
    saveMessages(messages.map(m =>
      m.id === id
        ? {
          ...m,
          likes: m.likes?.includes(currentUser?.name)
            ? m.likes.filter(n => n !== currentUser?.name)
            : [...(m.likes || []), currentUser?.name],
          }
        : m
    ))
  }

  const memberData = members.map(m => {
    const loc = locations[m.id] || { city: 'לא ידוע', lat: 31.5, lng: 34.9 }
    return { ...m, ...loc }
  })

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fafafa' }}>
      {/* טאבים */}
      <div style={{
        display: 'flex',
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 16px',
      }}>
        {[
          { key: 'members', label: '👥 משפחה' },
          { key: 'messages', label: '💬 הודעות' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            style={{
              padding: '11px 14px',
              background: 'none',
              borderBottom: view === t.key ? '2px solid #1e40af' : '2px solid transparent',
              color: view === t.key ? '#1e40af' : '#64748b',
              fontSize: 13,
              fontWeight: view === t.key ? 700 : 400,
              marginBottom: -1,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* תוכן */}
      {view === 'members' && (
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 12px' }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            {memberData.map(member => (
              <MemberCard
                key={member.id}
                member={member}
                city={member.city}
                shelter={shelter}
                photo={member.photo}
                statusKey={member.statusKey}
                alertData={alertData}
                editingId={editingId}
                onToggleEdit={setEditingId}
                onSelectLocation={handleSelectLocation}
              />
            ))}
          </div>
        </div>
      )}

      {view === 'messages' && (
        <MessageWall
          messages={messages}
          currentUser={currentUser}
          onSendMessage={handleSendMessage}
          onDeleteMessage={handleDeleteMessage}
          onLikeMessage={handleLikeMessage}
        />
      )}
    </div>
  )
}
