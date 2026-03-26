import { useState } from 'react'
import { useUser } from '../App'
import { familyMembers, grandchildren } from '../data/familyData'

export default function LoginScreen() {
  const { login } = useUser()
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('adults')

  const isSelected = (p) => selected?.id === p.id

  const MemberButton = ({ person, accentColor = '#1e40af', accentBg = '#eff6ff' }) => (
    <button
      onClick={() => setSelected(person)}
      style={{
        padding: '12px 8px',
        borderRadius: 12,
        background: isSelected(person) ? accentColor : '#f8fafc',
        border: `2px solid ${isSelected(person) ? accentColor : '#e2e8f0'}`,
        color: isSelected(person) ? 'white' : '#1e293b',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        cursor: 'pointer', transition: 'all 0.15s ease',
      }}
    >
      <span style={{ fontSize: 22 }}>{person.emoji}</span>
      <span style={{ fontSize: 12, fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>{person.name}</span>
      {person.military && (
        <span style={{
          fontSize: 10,
          background: isSelected(person) ? 'rgba(255,255,255,0.3)' : '#dcfce7',
          color: isSelected(person) ? 'white' : '#15803d',
          padding: '1px 6px', borderRadius: 4, fontWeight: 700,
        }}>צבא</span>
      )}
    </button>
  )

  return (
    <div style={{
      height: '100dvh',
      background: 'linear-gradient(160deg, #1e3a8a 0%, #1e40af 50%, #3b82f6 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'flex-start', padding: '32px 20px 20px', overflow: 'auto',
    }}>
      {/* כותרת */}
      <div style={{ textAlign: 'center', marginBottom: 24, color: 'white' }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🏠</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>המשפחה שלנו</h1>
        <p style={{ fontSize: 15, opacity: 0.85, fontWeight: 300 }}>ברוכים הבאים! מי את/ה?</p>
      </div>

      {/* כרטיס בחירה */}
      <div style={{
        background: 'white', borderRadius: 20, padding: '16px 16px 20px',
        width: '100%', maxWidth: 400,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* טאבים */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { key: 'adults',       label: '👨‍👩‍👧 מבוגרים',  color: '#1e40af' },
            { key: 'grandchildren',label: '🧒 נכדים',      color: '#d97706' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSelected(null) }}
              style={{
                flex: 1, padding: '9px', borderRadius: 10,
                background: tab === t.key ? t.color : '#f1f5f9',
                color: tab === t.key ? 'white' : '#64748b',
                fontSize: 13, fontWeight: 700,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* רשימה */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8, marginBottom: 16,
          maxHeight: 320, overflow: 'auto',
        }}>
          {tab === 'adults'
            ? familyMembers.map(m => (
                <MemberButton key={m.id} person={m} accentColor="#1e40af" />
              ))
            : grandchildren.map(c => (
                <MemberButton key={c.id} person={c} accentColor="#d97706" />
              ))
          }
        </div>

        {/* כפתור כניסה */}
        <button
          onClick={() => selected && login(selected)}
          disabled={!selected}
          style={{
            width: '100%', padding: '14px', borderRadius: 12,
            background: selected
              ? tab === 'adults'
                ? 'linear-gradient(135deg, #1e40af, #3b82f6)'
                : 'linear-gradient(135deg, #d97706, #f59e0b)'
              : '#e2e8f0',
            color: selected ? 'white' : '#94a3b8',
            fontSize: 16, fontWeight: 700,
            cursor: selected ? 'pointer' : 'not-allowed',
            boxShadow: selected ? '0 4px 12px rgba(30,64,175,0.35)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          {selected ? `כניסה כ-${selected.name} 👋` : 'בחר/י שם'}
        </button>
      </div>

      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 16 }}>
        אפליקציית משפחה פרטית
      </p>
    </div>
  )
}
