import { useState, useRef } from 'react'
import { useUser } from '../App'
import { cityAlertData, alertLevelConfig } from '../data/familyData'
import { STATUSES, getStatus } from '../data/statusConfig'

const PROFILE_KEY = 'familyapp_profiles'

function useProfile(userId) {
  const [profiles, setProfiles] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}') } catch { return {} }
  })
  const profile = profiles[userId] || {}
  const saveProfile = (updates) => {
    const updated = { ...profiles, [userId]: { ...profile, ...updates } }
    setProfiles(updated)
    localStorage.setItem(PROFILE_KEY, JSON.stringify(updated))
  }
  return [profile, saveProfile]
}

export default function ProfileScreen() {
  const { currentUser, logout, allMembers, shelter, toggleShelter, photos, savePhoto, statuses, setMemberStatus } = useUser()
  const myStatus = getStatus(statuses[currentUser?.id])
  const [profile, saveProfile] = useProfile(currentUser?.id)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    phone: profile.phone || '',
    city: profile.city || currentUser?.city || '',
    bio: profile.bio || '',
  })
  const fileRef = useRef()

  const myPhoto = photos[currentUser?.id] || null
  const isShelter = shelter[currentUser?.id]?.active || false
  const shelterSince = shelter[currentUser?.id]?.since

  const cityData = cityAlertData[currentUser?.city] || { alerts: 0, level: 'low' }
  const levelCfg = alertLevelConfig[cityData.level]

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    // צמצום גודל התמונה לפני שמירה
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX = 300
        const ratio = Math.min(MAX / img.width, MAX / img.height)
        canvas.width  = img.width  * ratio
        canvas.height = img.height * ratio
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        savePhoto(currentUser.id, canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    saveProfile(form)
    setEditing(false)
  }

  const formatSince = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  }

  // סטטיסטיקות
  const events   = (() => { try { return JSON.parse(localStorage.getItem('familyapp_events') || '[]') } catch { return [] } })()
  const requests = (() => { try { return JSON.parse(localStorage.getItem('familyapp_requests') || '[]') } catch { return [] } })()
  const myEvents = events.filter(e => e.attending?.includes(currentUser?.name)).length
  const myHelp   = requests.filter(r => r.signedUp?.includes(currentUser?.name) || r.interested?.includes(currentUser?.name)).length

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── סטטוס נוכחי ──────────────────────────────────────────── */}
      <div style={{ margin: '12px 16px 0', flexShrink: 0 }}>
        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>📍 הסטטוס שלי עכשיו</span>
          {myStatus && (
            <span style={{ background: myStatus.bg, color: myStatus.color, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
              {myStatus.icon} {myStatus.label}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {STATUSES.map(s => {
            const active = statuses[currentUser?.id] === s.key
            return (
              <button
                key={s.key}
                onClick={() => setMemberStatus(currentUser.id, active ? null : s.key)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  background: active ? s.color : s.bg,
                  color: active ? 'white' : s.color,
                  fontSize: 13,
                  fontWeight: 700,
                  border: active ? 'none' : `1.5px solid ${s.color}30`,
                  display: 'flex', alignItems: 'center', gap: 5,
                  transition: 'all 0.15s',
                }}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── כפתור מקלט בולט ─────────────────────────────────────── */}
      <button
        onClick={() => toggleShelter(currentUser.id, !isShelter)}
        className={isShelter ? 'shelter-pulse' : ''}
        style={{
          margin: '12px 16px 0',
          padding: '14px',
          borderRadius: 14,
          background: isShelter
            ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
            : 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
          color: isShelter ? 'white' : '#475569',
          fontSize: 16,
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          border: isShelter ? 'none' : '1.5px solid #cbd5e1',
          boxShadow: isShelter ? '0 4px 16px rgba(220,38,38,0.4)' : '0 1px 3px rgba(0,0,0,0.06)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 22 }}>{isShelter ? '🚨' : '🏠'}</span>
        {isShelter
          ? `אני במקלט כרגע${shelterSince ? ` · מאז ${formatSince(shelterSince)}` : ''}`
          : 'לחץ/י כשאת/ה במקלט'
        }
      </button>

      {/* ── כותרת ────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        padding: '16px 16px 20px',
        color: 'white',
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        marginTop: 10, flexShrink: 0,
      }}>
        {/* תמונת פרופיל */}
        <div
          style={{ position: 'relative', cursor: 'pointer', marginBottom: 10 }}
          onClick={() => fileRef.current?.click()}
        >
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: myPhoto ? 'transparent' : '#334155',
            border: '3px solid #3b82f6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', fontSize: 38,
          }}>
            {myPhoto
              ? <img src={myPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : currentUser?.emoji
            }
          </div>
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'rgba(0,0,0,0.55)', borderRadius: '0 0 50px 50px',
            padding: '3px', fontSize: 11, textAlign: 'center',
          }}>
            📷
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{currentUser?.name}</h1>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
            {currentUser?.role}
          </span>
          {currentUser?.military && (
            <span style={{ background: '#15803d', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
              🪖 צבא
            </span>
          )}
          <span style={{ background: levelCfg.bg, color: levelCfg.color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
            {levelCfg.icon} {currentUser?.city}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {/* סטטיסטיקות */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'אירועים', value: myEvents,            icon: '📅', color: '#7c3aed', bg: '#f5f3ff' },
            { label: 'עזרתי',  value: myHelp,              icon: '🤝', color: '#16a34a', bg: '#f0fdf4' },
            { label: 'משפחה',  value: allMembers?.length,   icon: '👨‍👩‍👧‍👦', color: '#1e40af', bg: '#eff6ff' },
          ].map(stat => (
            <div key={stat.label} style={{ background: stat.bg, borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 22 }}>{stat.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 10, color: stat.color, opacity: 0.8 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* פרטים אישיים */}
        <div style={{ background: 'white', borderRadius: 14, padding: '16px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>📝 פרטים אישיים</h3>
            <button
              onClick={() => {
                if (editing) { handleSave() }
                else { setForm({ phone: profile.phone || '', city: profile.city || currentUser?.city || '', bio: profile.bio || '' }); setEditing(true) }
              }}
              style={{
                padding: '6px 14px', borderRadius: 8,
                background: editing ? '#1e40af' : '#f1f5f9',
                color: editing ? 'white' : '#475569',
                fontSize: 13, fontWeight: 600,
              }}
            >
              {editing ? '💾 שמור' : '✏️ ערוך'}
            </button>
          </div>

          {[
            { label: '📱 טלפון', key: 'phone', placeholder: '050-1234567' },
            { label: '📍 עיר',   key: 'city',  placeholder: 'תל אביב' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 4 }}>{f.label}</label>
              {editing
                ? <input value={form[f.key]} onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14 }} />
                : <p style={{ fontSize: 15, color: '#1e293b', fontWeight: 500 }}>{profile[f.key] || (f.key === 'city' ? currentUser?.city : '—')}</p>
              }
            </div>
          ))}

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 4 }}>💬 משהו עלי</label>
            {editing
              ? <textarea value={form.bio} onChange={e => setForm(x => ({ ...x, bio: e.target.value }))}
                  placeholder="ספר/י קצת על עצמך..." rows={3}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, resize: 'none' }} />
              : <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6 }}>{profile.bio || 'עוד לא מילאת...'}</p>
            }
          </div>
        </div>

        <button onClick={logout} style={{
          width: '100%', padding: '13px', borderRadius: 12,
          background: '#fff1f2', color: '#dc2626',
          fontSize: 15, fontWeight: 700, border: '1.5px solid #fca5a5',
        }}>
          🚪 התנתקות
        </button>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#cbd5e1', marginTop: 16, marginBottom: 8 }}>
          המשפחה שלנו 🏠 · גרסה 1.0
        </p>
      </div>
    </div>
  )
}
