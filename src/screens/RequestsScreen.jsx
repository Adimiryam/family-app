import { useState } from 'react'
import { useUser } from '../App'
import { initialRequests } from '../data/familyData'

const STORAGE_KEY = 'familyapp_requests'

function useRequests() {
  const [requests, setRequests] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : initialRequests
    } catch { return initialRequests }
  })

  const save = (updated) => {
    setRequests(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  return [requests, save]
}

const categoryIcons = {
  'בייביסיטר':      '👶',
  'שיעורים פרטיים': '📚',
  'עזרה כללית':     '🤝',
  'אחר':            '💬',
}

function RequestCard({ item, currentUser, onSignup, onInterest, onUnsignup, onUninterest, onEdit, onDelete }) {
  const isRequest = item.type === 'request'
  const alreadySigned = isRequest
    ? item.signedUp?.includes(currentUser?.name)
    : item.interested?.includes(currentUser?.name)
  const isOwner = item.author === currentUser?.name

  const handleActionClick = () => {
    if (alreadySigned) {
      isRequest ? onUnsignup(item.id) : onUninterest(item.id)
    } else {
      isRequest ? onSignup(item.id) : onInterest(item.id)
    }
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: 14,
      marginBottom: 12,
      overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
    }}>
      {/* פס צבע עליון */}
      <div style={{
        height: 4,
        background: isRequest
          ? 'linear-gradient(90deg, #3b82f6, #60a5fa)'
          : 'linear-gradient(90deg, #16a34a, #4ade80)',
      }} />

      <div style={{ padding: '14px 16px' }}>
        {/* כותרת + קטגוריה + כפתורי עריכה */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>
            {categoryIcons[item.category] || '💬'}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 20,
                background: isRequest ? '#eff6ff' : '#f0fdf4',
                color: isRequest ? '#1e40af' : '#15803d',
                fontWeight: 700,
              }}>
                {isRequest ? '🙋 בקשה' : '🎁 הצעה'}
              </span>
              <span style={{
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 20,
                background: '#f8fafc',
                color: '#64748b',
                fontWeight: 600,
              }}>
                {item.category}
              </span>
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginTop: 4 }}>
              {item.title}
            </h3>
          </div>
          {isOwner && (
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button
                onClick={() => onEdit(item)}
                style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: '#f1f5f9', color: '#475569',
                  fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: 'none', cursor: 'pointer',
                }}
              >✏️</button>
              <button
                onClick={() => onDelete(item.id)}
                style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: '#fef2f2', color: '#dc2626',
                  fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: 'none', cursor: 'pointer',
                }}
              >🗑️</button>
            </div>
          )}
        </div>

        <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, marginBottom: 10 }}>
          {item.description}
        </p>

        {/* פרטים נוספים */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>✍️ {item.author}</span>
          {item.date  && <span style={{ fontSize: 12, color: '#94a3b8' }}>📅 {item.date}</span>}
          {item.hours && <span style={{ fontSize: 12, color: '#94a3b8' }}>🕐 {item.hours}</span>}
          {item.price && <span style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>💰 {item.price}</span>}
          {item.numKids && <span style={{ fontSize: 12, color: '#94a3b8' }}>👶 {item.numKids} ילדים</span>}
        </div>

        {/* רשימת נרשמים */}
        {isRequest && item.signedUp?.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>
              ✅ נרשמו לעזור: {item.signedUp.join(', ')}
            </span>
          </div>
        )}
        {!isRequest && item.interested?.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: '#1e40af', fontWeight: 600 }}>
              ⭐ מעוניינים: {item.interested.join(', ')}
            </span>
          </div>
        )}

        {/* כפתור פעולה */}
        <button
          onClick={handleActionClick}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: 10,
            background: alreadySigned
              ? '#fef2f2'
              : isRequest
                ? 'linear-gradient(135deg, #3b82f6, #1e40af)'
                : 'linear-gradient(135deg, #16a34a, #15803d)',
            color: alreadySigned ? '#dc2626' : 'white',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            border: alreadySigned ? '1.5px solid #fecaca' : 'none',
          }}
        >
          {alreadySigned
            ? isRequest
              ? '❌ בטל הרשמה'
              : '❌ בטל התעניינות'
            : isRequest
              ? '🙋 אני יכול/ה לעזור!'
              : '⭐ אני מעוניין/ת'
          }
        </button>
      </div>
    </div>
  )
}

function ItemModal({ onClose, onSave, currentUser, initial }) {
  const isEdit = !!initial
  const [form, setForm] = useState(initial ? {
    type:        initial.type        || 'request',
    category:    initial.category    || 'בייביסיטר',
    title:       initial.title       || '',
    description: initial.description || '',
    date:        initial.date        || '',
    hours:       initial.hours       || '',
    numKids:     initial.numKids     || '',
    price:       initial.price       || '',
  } : {
    type: 'request',
    category: 'בייביסיטר',
    title: '',
    description: '',
    date: '',
    hours: '',
    numKids: '',
    price: '',
  })

  const categories = ['בייביסיטר', 'שיעורים פרטיים', 'עזרה כללית', 'אחר']

  const handleSubmit = () => {
    if (!form.title.trim() || !form.description.trim()) return
    if (isEdit) {
      onSave({ ...initial, ...form })
    } else {
      onSave({
        ...form,
        id: Date.now(),
        author: currentUser?.name || 'אנונימי',
        signedUp: [],
        interested: [],
        createdAt: new Date().toLocaleDateString('he-IL'),
      })
    }
    onClose()
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'flex-end',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px 20px 0 0',
        padding: '24px 20px',
        width: '100%',
        maxWidth: 480,
        margin: '0 auto',
        maxHeight: '80vh',
        overflow: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>
            {isEdit ? '✏️ עריכה' : '➕ הוסף בקשה / הצעה'}
          </h2>
          <button onClick={onClose} style={{ fontSize: 22, background: 'none', color: '#94a3b8', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>

        {/* סוג */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {['request', 'offer'].map(t => (
            <button
              key={t}
              onClick={() => setForm(f => ({ ...f, type: t }))}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: 10,
                background: form.type === t ? (t === 'request' ? '#1e40af' : '#15803d') : '#f1f5f9',
                color: form.type === t ? 'white' : '#64748b',
                fontSize: 14,
                fontWeight: 700,
                border: 'none', cursor: 'pointer',
              }}
            >
              {t === 'request' ? '🙋 בקשה' : '🎁 הצעה'}
            </button>
          ))}
        </div>

        {/* קטגוריה */}
        <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
          קטגוריה
        </label>
        <select
          value={form.category}
          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 10,
            border: '1.5px solid #e2e8f0', fontSize: 14,
            marginBottom: 12, background: 'white', direction: 'rtl',
          }}
        >
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>

        {/* כותרת */}
        <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
          כותרת
        </label>
        <input
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="למשל: צריכים בייביסיטר לשבת..."
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 10,
            border: '1.5px solid #e2e8f0', fontSize: 14, marginBottom: 12,
          }}
        />

        {/* תיאור */}
        <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
          פרטים
        </label>
        <textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="הוסף/י פרטים נוספים..."
          rows={3}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 10,
            border: '1.5px solid #e2e8f0', fontSize: 14, marginBottom: 12,
            resize: 'none',
          }}
        />

        {form.type === 'request' ? (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
                  תאריך
                </label>
                <input
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  placeholder="01/04/2026"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14 }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
                  שעות
                </label>
                <input
                  value={form.hours}
                  onChange={e => setForm(f => ({ ...f, hours: e.target.value }))}
                  placeholder="18:00 - 23:00"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14 }}
                />
              </div>
            </div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
              מספר ילדים
            </label>
            <input
              value={form.numKids}
              onChange={e => setForm(f => ({ ...f, numKids: e.target.value }))}
              placeholder="למשל: 2"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, marginBottom: 12 }}
            />
          </>
        ) : (
          <>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
              מחיר (אופציונלי)
            </label>
            <input
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              placeholder="80 ₪ לשעה / חינם"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14 }}
            />
          </>
        )}

        <button
          onClick={handleSubmit}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
            color: 'white',
            fontSize: 16,
            fontWeight: 700,
            marginTop: 20,
            border: 'none', cursor: 'pointer',
          }}
        >
          {isEdit ? 'שמור שינויים ✅' : 'פרסם 🚀'}
        </button>
      </div>
    </div>
  )
}

export default function RequestsScreen() {
  const { currentUser } = useUser()
  const [requests, setRequests] = useRequests()
  const [tab, setTab] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)

  const filtered = tab === 'all' ? requests
    : tab === 'requests' ? requests.filter(r => r.type === 'request')
    : requests.filter(r => r.type === 'offer')

  const signup = (id) => {
    setRequests(requests.map(r =>
      r.id === id && !r.signedUp?.includes(currentUser?.name)
        ? { ...r, signedUp: [...(r.signedUp || []), currentUser?.name] }
        : r
    ))
  }

  const interest = (id) => {
    setRequests(requests.map(r =>
      r.id === id && !r.interested?.includes(currentUser?.name)
        ? { ...r, interested: [...(r.interested || []), currentUser?.name] }
        : r
    ))
  }

  const unsignup = (id) => {
    setRequests(requests.map(r =>
      r.id === id && r.signedUp?.includes(currentUser?.name)
        ? { ...r, signedUp: r.signedUp.filter(name => name !== currentUser?.name) }
        : r
    ))
  }

  const uninterest = (id) => {
    setRequests(requests.map(r =>
      r.id === id && r.interested?.includes(currentUser?.name)
        ? { ...r, interested: r.interested.filter(name => name !== currentUser?.name) }
        : r
    ))
  }

  const addNew = (item) => {
    setRequests([item, ...requests])
  }

  const updateItem = (updated) => {
    setRequests(requests.map(r => r.id === updated.id ? updated : r))
  }

  const deleteItem = (id) => {
    if (!window.confirm('למחוק את הפריט?')) return
    setRequests(requests.filter(r => r.id !== id))
  }

  const handleEdit = (item) => {
    setEditItem(item)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* כותרת */}
      <div style={{
        background: 'linear-gradient(135deg, #16a34a, #22c55e)',
        padding: '16px 16px 12px',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>🤝 הצעות ובקשות</h1>
          <p style={{ fontSize: 12, opacity: 0.85 }}>נעזור אחד לשני!</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 10,
            padding: '8px 14px',
            color: 'white',
            fontSize: 14,
            fontWeight: 700,
            border: 'none', cursor: 'pointer',
          }}
        >
          ➕ הוסף
        </button>
      </div>

      {/* טאבים */}
      <div style={{
        display: 'flex',
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 16px',
      }}>
        {[
          { key: 'all',      label: 'הכל' },
          { key: 'requests', label: '🙋 בקשות' },
          { key: 'offers',   label: '🎁 הצעות' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '11px 14px',
              background: 'none',
              borderBottom: tab === t.key ? '2px solid #16a34a' : '2px solid transparent',
              color: tab === t.key ? '#16a34a' : '#64748b',
              fontSize: 13,
              fontWeight: tab === t.key ? 700 : 400,
              marginBottom: -1,
              border: 'none', cursor: 'pointer',
            }}
          >
            {t.label} ({t.key === 'all' ? requests.length : requests.filter(r => r.type === (t.key === 'requests' ? 'request' : 'offer')).length})
          </button>
        ))}
      </div>

      {/* רשימה */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🤷</div>
            <p>אין כלום כאן עדיין</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>לחץ ➕ כדי להוסיף</p>
          </div>
        ) : (
          filtered.map(item => (
            <RequestCard
              key={item.id}
              item={item}
              currentUser={currentUser}
              onSignup={signup}
              onInterest={interest}
              onUnsignup={unsignup}
              onUninterest={uninterest}
              onEdit={handleEdit}
              onDelete={deleteItem}
            />
          ))
        )}
      </div>

      {showModal && (
        <ItemModal
          onClose={() => setShowModal(false)}
          onSave={addNew}
          currentUser={currentUser}
          initial={null}
        />
      )}

      {editItem && (
        <ItemModal
          onClose={() => setEditItem(null)}
          onSave={updateItem}
          currentUser={currentUser}
          initial={editItem}
        />
      )}
    </div>
  )
}
