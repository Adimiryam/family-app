import { useState, useEffect, useCallback, useRef } from 'react'
import { useUser } from '../App'
import { loadSharedMessages, saveSharedMessagesImmediate } from '../services/sharedState'

const STORAGE_KEY = 'familyapp_messages'
const MESSAGE_COLORS = ['#ec4899', '#3b82f6', '#16a34a', '#7c3aed', '#f59e0b', '#dc2626', '#14b8a6', '#eab308']

// ────────────────────────────────────────────────────────────
// hook עם סנכרון ענן
// ────────────────────────────────────────────────────────────
function useMessages() {
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  })

  const messagesRef = useRef(messages)
  messagesRef.current = messages

  const save = useCallback((updated) => {
    setMessages(updated)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch {}
    saveSharedMessagesImmediate(updated)
  }, [])

  useEffect(() => {
    loadSharedMessages().then(shared => {
      if (!shared || !shared.messages) {
        const local = messagesRef.current
        if (local && local.length > 0) {
          console.log('[Messages] cloud empty, pushing local:', local.length)
          saveSharedMessagesImmediate(local)
        }
        return
      }
      const cloudMessages = shared.messages
      const local = messagesRef.current
      const cloudIds = new Set(cloudMessages.map(m => m.id))
      const localOnly = local.filter(m => !cloudIds.has(m.id))
      const merged = [...localOnly, ...cloudMessages]
      if (localOnly.length > 0) {
        console.log('[Messages] found local-only items, pushing merged:', localOnly.length, 'new')
        saveSharedMessagesImmediate(merged)
      }
      setMessages(merged)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    }).catch(e => console.warn('[Messages] cloud load error:', e.message))

    const interval = setInterval(async () => {
      try {
        const shared = await loadSharedMessages()
        if (!shared || !shared.messages) return
        const cloudMessages = shared.messages
        const local = messagesRef.current
        const cloudIds = new Set(cloudMessages.map(m => m.id))
        const localOnly = local.filter(m => !cloudIds.has(m.id))
        const merged = [...localOnly, ...cloudMessages]
        setMessages(merged)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
      } catch {}
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  return [messages, save]
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
// מסך קיר המשפחה
// ────────────────────────────────────────────────────────────
export default function FamilyWallScreen() {
  const { currentUser } = useUser()
  const [messages, saveMessages] = useMessages()
  const [showMessageModal, setShowMessageModal] = useState(false)

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
      return { ...m, replies: [...(m.replies || []), reply] }
    })
    saveMessages(updated)
  }

  const handleDeleteMessage = (messageId) => {
    if (window.confirm('למחוק את ההודעה?')) {
      saveMessages(messages.filter(m => m.id !== messageId))
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* כותרת */}
      <div style={{
        background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
        padding: '16px 16px 12px', color: 'white',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>📝 קיר המשפחה</h1>
          <p style={{ fontSize: 12, opacity: 0.85 }}>
            {messages.length} הודעות · שתפו רגעים ומחשבות
          </p>
        </div>
        <button onClick={() => setShowMessageModal(true)} style={{
          padding: '8px 14px', borderRadius: 12,
          background: 'rgba(255,255,255,0.2)', color: 'white',
          fontSize: 13, fontWeight: 700, border: '1px solid rgba(255,255,255,0.3)',
          cursor: 'pointer', backdropFilter: 'blur(4px)',
        }}>➕ הודעה חדשה</button>
      </div>

      {/* תוכן */}
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 14px 8px' }}>
        {messages.length === 0 ? (
          <div style={{
            padding: '40px 20px', textAlign: 'center', background: '#f8fafc',
            borderRadius: 16, color: '#94a3b8', marginTop: 20,
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>הקיר ריק</div>
            <div style={{ fontSize: 13 }}>היו הראשונים להוסיף הודעה למשפחה! 🎉</div>
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
