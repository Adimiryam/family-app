import { useState } from 'react'
import { useUser } from '../App'
import { initialEvents } from '../data/familyData'

const STORAGE_KEY = 'familyapp_events'

const COLORS = ['#1e40af','#7c3aed','#15803d','#dc2626','#d97706','#0369a1','#be185d']
const EMOJIS = ['🕍','🎉','🎂','🏖️','🍽️','💒','🎓','⚽','🎵','🏕️','🎁','🌟']

// נרמול נתונים ישנים (assignedTo: string → assignedTo: string[])
function normalizeTask(t) {
  return {
    ...t,
    slots: t.slots ?? 1,
    assignedTo: Array.isArray(t.assignedTo)
      ? t.assignedTo
      : t.assignedTo ? [t.assignedTo] : [],
  }
}
function normalizeEvent(e) {
  return { ...e, tasks: (e.tasks || []).map(normalizeTask) }
}

function useEvents() {
  const [events, setEvents] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return (saved ? JSON.parse(saved) : initialEvents).map(normalizeEvent)
    } catch { return initialEvents.map(normalizeEvent) }
  })
  const save = (updated) => {
    setEvents(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }
  return [events, save]
}

// ── מודל הוספה / עריכת אירוע ─────────────────────────────────
function EventFormModal({ initial, onClose, onSave }) {
  const blank = { title: '', date: '', time: '', location: '', description: '', emoji: '🎉', color: '#7c3aed' }
  const [form, setForm] = useState(initial ? { ...initial } : blank)
  const f = (key, val) => setForm(p => ({ ...p, [key]: val }))

  const submit = () => {
    if (!form.title.trim() || !form.date.trim()) return
    onSave(form)
    onClose()
  }

  const inp = (key, placeholder, type = 'text') => (
    <input value={form[key]} onChange={e => f(key, e.target.value)}
      placeholder={placeholder} type={type}
      style={{ width: '100%', padding: '10px 12px', borderRadius: 10,
        border: '1.5px solid #e2e8f0', fontSize: 14, marginBottom: 12, direction: 'rtl' }} />
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, margin: '0 auto', maxHeight: '85vh', overflow: 'auto', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1e293b' }}>{initial ? '✏️ ערוך אירוע' : '➕ אירוע חדש'}</h2>
          <button onClick={onClose} style={{ fontSize: 22, background: 'none', color: '#94a3b8' }}>✕</button>
        </div>

        {/* אימוג'י */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {EMOJIS.map(e => (
            <button key={e} onClick={() => f('emoji', e)}
              style={{ fontSize: 22, background: form.emoji === e ? '#eff6ff' : 'none',
                border: form.emoji === e ? '2px solid #3b82f6' : '2px solid transparent', borderRadius: 8, padding: '4px 6px' }}>
              {e}
            </button>
          ))}
        </div>

        {/* צבע */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {COLORS.map(c => (
            <button key={c} onClick={() => f('color', c)}
              style={{ width: 28, height: 28, borderRadius: '50%', background: c,
                border: form.color === c ? '3px solid #1e293b' : '3px solid transparent' }} />
          ))}
        </div>

        {inp('title', 'שם האירוע')}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>{inp('date', 'תאריך (05/04/2026)')}</div>
          <div style={{ flex: 1 }}>{inp('time', 'שעה (12:00)')}</div>
        </div>
        {inp('location', 'מיקום')}
        <textarea value={form.description} onChange={e => f('description', e.target.value)}
          placeholder="תיאור..." rows={3}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10,
            border: '1.5px solid #e2e8f0', fontSize: 14, marginBottom: 12, resize: 'none', direction: 'rtl' }} />

        <button onClick={submit}
          style={{ width: '100%', padding: '14px', borderRadius: 12,
            background: `linear-gradient(135deg, ${form.color}, ${form.color}cc)`,
            color: 'white', fontSize: 15, fontWeight: 700 }}>
          {initial ? '💾 שמור' : '🚀 צור אירוע'}
        </button>
      </div>
    </div>
  )
}

// ── מודל עריכת משימות ─────────────────────────────────────────
function TasksEditModal({ tasks, onClose, onSave }) {
  const [draft, setDraft] = useState(tasks.map(t => ({ ...t })))
  const [newName, setNewName] = useState('')
  const [newSlots, setNewSlots] = useState(1)

  const addTask = () => {
    if (!newName.trim()) return
    setDraft(d => [...d, { id: Date.now(), name: newName.trim(), slots: newSlots, assignedTo: [] }])
    setNewName('')
    setNewSlots(1)
  }

  const removeTask = (id) => setDraft(d => d.filter(t => t.id !== id))
  const updateSlots = (id, slots) => setDraft(d => d.map(t => t.id === id ? { ...t, slots: Math.max(1, Number(slots)) } : t))
  const updateName  = (id, name)  => setDraft(d => d.map(t => t.id === id ? { ...t, name } : t))

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2100, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, margin: '0 auto', maxHeight: '80vh', overflow: 'auto', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800 }}>📋 ערוך משימות</h2>
          <button onClick={onClose} style={{ fontSize: 22, background: 'none', color: '#94a3b8' }}>✕</button>
        </div>

        {draft.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <input value={t.name} onChange={e => updateName(t.id, e.target.value)}
              style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, direction: 'rtl' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 11, color: '#64748b' }}>מקומות:</span>
              <input type="number" min="1" max="20" value={t.slots}
                onChange={e => updateSlots(t.id, e.target.value)}
                style={{ width: 44, padding: '6px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, textAlign: 'center' }} />
            </div>
            <button onClick={() => removeTask(t.id)} style={{ color: '#dc2626', fontSize: 18, background: 'none' }}>✕</button>
          </div>
        ))}

        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14, marginTop: 4 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="שם משימה חדשה..."
              style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, direction: 'rtl' }} />
            <input type="number" min="1" max="20" value={newSlots}
              onChange={e => setNewSlots(Number(e.target.value))}
              style={{ width: 44, padding: '9px 6px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, textAlign: 'center' }} />
            <button onClick={addTask}
              style={{ padding: '9px 14px', borderRadius: 8, background: '#1e40af', color: 'white', fontSize: 13, fontWeight: 700 }}>
              ➕
            </button>
          </div>
        </div>

        <button onClick={() => { onSave(draft); onClose() }}
          style={{ width: '100%', padding: '13px', borderRadius: 12,
            background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
            color: 'white', fontSize: 15, fontWeight: 700, marginTop: 16 }}>
          💾 שמור משימות
        </button>
      </div>
    </div>
  )
}

// ── פרטי אירוע ───────────────────────────────────────────────
function EventDetail({ event, currentUser, onBack, onSave, onDelete }) {
  const [showEditEvent, setShowEditEvent] = useState(false)
  const [showEditTasks, setShowEditTasks] = useState(false)

  const isAttending    = event.attending?.includes(currentUser?.name)
  const isNotAttending = event.notAttending?.includes(currentUser?.name)

  const setRsvp = (attend) => {
    onSave({
      ...event,
      attending:    attend
        ? [...(event.attending || []).filter(n => n !== currentUser?.name), currentUser?.name]
        : (event.attending || []).filter(n => n !== currentUser?.name),
      notAttending: !attend
        ? [...(event.notAttending || []).filter(n => n !== currentUser?.name), currentUser?.name]
        : (event.notAttending || []).filter(n => n !== currentUser?.name),
    })
  }

  const toggleTask = (taskId) => {
    onSave({
      ...event,
      tasks: event.tasks.map(t => {
        if (t.id !== taskId) return t
        const already = t.assignedTo.includes(currentUser?.name)
        return {
          ...t,
          assignedTo: already
            ? t.assignedTo.filter(n => n !== currentUser?.name)
            : t.assignedTo.length < t.slots
              ? [...t.assignedTo, currentUser?.name]
              : t.assignedTo,
        }
      }),
    })
  }

  const saveEventEdit = (updated) => {
    onSave({ ...event, ...updated })
  }

  const saveTasksEdit = (updatedTasks) => {
    onSave({ ...event, tasks: updatedTasks })
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ background: `linear-gradient(135deg, ${event.color}, ${event.color}cc)`, padding: '16px 16px 20px', color: 'white', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <button onClick={onBack}
            style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 12px', color: 'white', fontSize: 14, marginBottom: 12 }}>
            ← חזרה
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowEditEvent(true)}
              style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 12px', color: 'white', fontSize: 13, fontWeight: 700 }}>
              ✏️ ערוך
            </button>
            <button onClick={() => { if (window.confirm('למחוק אירוע זה?')) { onDelete(event.id); onBack() } }}
              style={{ background: 'rgba(220,38,38,0.4)', borderRadius: 8, padding: '6px 12px', color: 'white', fontSize: 13, fontWeight: 700 }}>
              🗑️
            </button>
          </div>
        </div>
        <div style={{ fontSize: 36, marginBottom: 6 }}>{event.emoji}</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{event.title}</h1>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', opacity: 0.9, fontSize: 13 }}>
          <span>📅 {event.date}</span>
          <span>🕐 {event.time}</span>
          <span>📍 {event.location}</span>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        <div style={{ background: 'white', borderRadius: 14, padding: '14px 16px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6 }}>{event.description}</p>
        </div>

        {/* RSVP */}
        <div style={{ background: 'white', borderRadius: 14, padding: '16px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>🙋 אני מגיע/ה?</h3>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <button onClick={() => setRsvp(true)}
              style={{ flex: 1, padding: '12px', borderRadius: 10, background: isAttending ? '#16a34a' : '#f0fdf4', color: isAttending ? 'white' : '#16a34a', border: isAttending ? 'none' : '1.5px solid #86efac', fontSize: 14, fontWeight: 700 }}>
              ✅ כן, מגיע/ה!
            </button>
            <button onClick={() => setRsvp(false)}
              style={{ flex: 1, padding: '12px', borderRadius: 10, background: isNotAttending ? '#dc2626' : '#fff1f2', color: isNotAttending ? 'white' : '#dc2626', border: isNotAttending ? 'none' : '1.5px solid #fca5a5', fontSize: 14, fontWeight: 700 }}>
              ❌ לא יכול/ה
            </button>
          </div>
          {event.attending?.length > 0 && <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, marginBottom: 4 }}>✅ מגיעים ({event.attending.length}): {event.attending.join(', ')}</div>}
          {event.notAttending?.length > 0 && <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>❌ לא מגיעים: {event.notAttending.join(', ')}</div>}
        </div>

        {/* משימות */}
        <div style={{ background: 'white', borderRadius: 14, padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>📋 השתבצות</h3>
            <button onClick={() => setShowEditTasks(true)}
              style={{ fontSize: 12, color: '#3b82f6', fontWeight: 700, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '4px 10px' }}>
              ✏️ ערוך משימות
            </button>
          </div>

          {event.tasks.map(task => {
            const isMine  = task.assignedTo.includes(currentUser?.name)
            const isFull  = task.assignedTo.length >= task.slots && !isMine
            const taken   = task.assignedTo.length
            return (
              <div key={task.id} onClick={() => !isFull && toggleTask(task.id)}
                style={{ padding: '12px 14px', borderRadius: 10, background: isMine ? '#eff6ff' : isFull ? '#f8fafc' : '#fafafa',
                  border: isMine ? '1.5px solid #93c5fd' : '1.5px solid #e2e8f0', marginBottom: 8,
                  display: 'flex', alignItems: 'center', gap: 10, cursor: isFull ? 'not-allowed' : 'pointer', opacity: isFull ? 0.65 : 1 }}>
                <span style={{ fontSize: 18 }}>{isMine ? '✅' : isFull ? '🔒' : '⬜'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: isMine ? '#1e40af' : '#475569' }}>{task.name}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    {taken > 0 ? task.assignedTo.join(', ') : 'טרם נרשמו'}
                    {' '}· {taken}/{task.slots} מקומות
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showEditEvent && (
        <EventFormModal initial={event} onClose={() => setShowEditEvent(false)} onSave={saveEventEdit} />
      )}
      {showEditTasks && (
        <TasksEditModal tasks={event.tasks} onClose={() => setShowEditTasks(false)} onSave={saveTasksEdit} />
      )}
    </div>
  )
}

// ── מסך ראשי ─────────────────────────────────────────────────
export default function EventsScreen() {
  const { currentUser } = useUser()
  const [events, setEvents] = useEvents()
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [showAddEvent, setShowAddEvent] = useState(false)

  const saveEvent = (updated) => {
    const upd = events.map(e => e.id === updated.id ? { ...e, ...updated } : e)
    setEvents(upd)
    setSelectedEvent({ ...selectedEvent, ...updated })
  }

  const addEvent = (form) => {
    const newEvent = {
      ...form,
      id: Date.now(),
      tasks: [],
      attending: [],
      notAttending: [],
    }
    setEvents([newEvent, ...events])
  }

  const deleteEvent = (id) => {
    setEvents(events.filter(e => e.id !== id))
  }

  if (selectedEvent) {
    const live = events.find(e => e.id === selectedEvent.id) || selectedEvent
    return (
      <EventDetail
        event={live}
        currentUser={currentUser}
        onBack={() => setSelectedEvent(null)}
        onSave={saveEvent}
        onDelete={deleteEvent}
      />
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', padding: '16px 16px 20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>📅 אירועים קרובים</h1>
          <p style={{ fontSize: 12, opacity: 0.85 }}>לחץ/י על אירוע לפרטים</p>
        </div>
        <button onClick={() => setShowAddEvent(true)}
          style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '8px 14px', color: 'white', fontSize: 14, fontWeight: 700 }}>
          ➕ הוסף
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {events.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
            <p>אין אירועים עדיין</p>
          </div>
        )}
        {events.map(event => {
          const isAttending = event.attending?.includes(currentUser?.name)
          const tasksDone   = event.tasks.filter(t => t.assignedTo.length > 0).length

          return (
            <div key={event.id} style={{ background: 'white', borderRadius: 16, marginBottom: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <div style={{ background: `linear-gradient(90deg, ${event.color}, ${event.color}80)`, padding: '16px 18px', color: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 32, marginBottom: 4 }}>{event.emoji}</div>
                    <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{event.title}</h2>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, opacity: 0.9 }}>
                      <span>📅 {event.date}</span>
                      <span>🕐 {event.time}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '14px 18px' }}>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>📍 {event.location}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: isAttending ? '#dcfce7' : '#f1f5f9', color: isAttending ? '#15803d' : '#64748b', fontWeight: 600 }}>
                    {isAttending ? '✅ מגיע/ה' : '❓ עוד לא ענית'}
                  </span>
                  <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: '#eff6ff', color: '#1e40af', fontWeight: 600 }}>
                    📋 {tasksDone}/{event.tasks.length} משימות
                  </span>
                  <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: '#f0fdf4', color: '#15803d', fontWeight: 600 }}>
                    👥 {event.attending?.length || 0} מגיעים
                  </span>
                </div>
                <button onClick={() => setSelectedEvent(event)}
                  style={{ width: '100%', padding: '10px', borderRadius: 10, background: `${event.color}15`, color: event.color, fontSize: 13, fontWeight: 700, border: `1px solid ${event.color}40` }}>
                  לפרטים ולהשתבצות ←
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {showAddEvent && (
        <EventFormModal onClose={() => setShowAddEvent(false)} onSave={addEvent} />
      )}
    </div>
  )
}
