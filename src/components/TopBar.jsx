import { useState, useEffect } from 'react'
import { fetchCurrentAlert } from '../services/pikudHaoref'

export default function TopBar() {
  const [alert, setAlert] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const load = async () => {
      const data = await fetchCurrentAlert()
      if (data) {
        setAlert(data)
        setDismissed(false) // התראה חדשה — מציגים שוב
      } else {
        setAlert(null)
      }
    }

    load()
    const interval = setInterval(load, 30_000) // בודק כל 30 שניות
    return () => clearInterval(interval)
  }, [])

  // אם אין התראה או שהמשתמש סגר — לא מציגים כלום
  if (!alert || dismissed) return null

  const cities = alert.data
    ? String(alert.data).split(/,\s*|;\s*/).slice(0, 5).join(' • ')
    : ''

  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
      color: 'white',
      padding: '10px 40px 10px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      zIndex: 900,
      boxShadow: '0 2px 8px rgba(220,38,38,0.4)',
      animation: 'alertPulse 1.5s ease-in-out infinite',
      direction: 'rtl',
    }}>
      {/* אייקון */}
      <span style={{ fontSize: 20, flexShrink: 0 }}>🚨</span>

      {/* טקסט */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: 0.3 }}>
          {alert.title || 'אזעקה פעילה'}
        </div>
        {cities && (
          <div style={{
            fontSize: 12,
            opacity: 0.9,
            marginTop: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {cities}
          </div>
        )}
      </div>

      {/* כפתור סגירה */}
      <button
        onClick={() => setDismissed(true)}
        style={{
          position: 'absolute',
          top: '50%',
          left: 10,
          transform: 'translateY(-50%)',
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          color: 'white',
          width: 24,
          height: 24,
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 700,
          flexShrink: 0,
        }}
        aria-label="סגור התראה"
      >
        ×
      </button>

      <style>{`
        @keyframes alertPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
      `}</style>
    </div>
  )
}
