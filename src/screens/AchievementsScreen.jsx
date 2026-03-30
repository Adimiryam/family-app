import { useState, useEffect, useCallback, useRef } from 'react'
import { useUser } from '../App'
import { initialAchievements } from '../data/familyData'
import { loadSharedAchievements, saveSharedAchievementsImmediate } from '../services/sharedState'

const STORAGE_KEY = 'familyapp_achievements'

function useAchievements() {
  const [achievements, setAchievements] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : initialAchievements
    } catch { return initialAchievements }
  })

  const achievementsRef = useRef(achievements)
  achievementsRef.current = achievements

  const save = useCallback((updated) => {
    setAchievements(updated)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch {}
    saveSharedAchievementsImmediate(updated)
  }, [])

  useEffect(() => {
    loadSharedAchievements().then(shared => {
      if (!shared || !shared.achievements) {
        const local = achievementsRef.current
        if (local && local.length > 0) {
          console.log('[Achievements] cloud empty, pushing local:', local.length)
          saveSharedAchievementsImmediate(local)
        }
        return
      }
      const cloudAchievements = shared.achievements
      const local = achievementsRef.current
      const cloudIds = new Set(cloudAchievements.map(a => a.id))
      const localOnly = local.filter(a => !cloudIds.has(a.id))
      const merged = [...localOnly, ...cloudAchievements]
      if (localOnly.length > 0) {
        console.log('[Achievements] found local-only items, pushing merged:', localOnly.length, 'new')
        saveSharedAchievementsImmediate(merged)
      }
      setAchievements(merged)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    }).catch(e => console.warn('[Achievements] cloud load error:', e.message))

    const interval = setInterval(async () => {
      try {
        const shared = await loadSharedAchievements()
        if (!shared || !shared.achievements) return
        const cloudAchievements = shared.achievements
        const local = achievementsRef.current
        const cloudIds = new Set(cloudAchievements.map(a => a.id))
        const localOnly = local.filter(a => !cloudIds.has(a.id))
        const merged = [...localOnly, ...cloudAchievements]
        setAchievements(merged)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
      } catch {}
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  return [achievements, save]
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

export default function AchievementsScreen() {
  const { currentUser } = useUser()
  const [achievements, saveAchievements] = useAchievements()
  const [showModal, setShowModal] = useState(false)
  const [editAchievement, setEditAchievement] = useState(null)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* כותרת */}
      <div style={{
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        padding: '16px 16px 12px', color: 'white',
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>🏆 הישגי המשפחה</h1>
        <p style={{ fontSize: 12, opacity: 0.85 }}>{achievements.length} הישגים</p>
      </div>

      {/* תוכן */}
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 14px 8px' }}>
        <button onClick={() => { setEditAchievement(null); setShowModal(true) }}
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
                  <button onClick={() => { setEditAchievement(ach); setShowModal(true) }}
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
      </div>

      {showModal && (
        <AchievementModal
          onClose={() => { setShowModal(false); setEditAchievement(null) }}
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
    </div>
  )
}
