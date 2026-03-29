import { useLocation, useNavigate } from 'react-router-dom'

const tabs = [
  { path: '/map',      icon: '🗺️',  label: 'מפה'     },
  { path: '/requests', icon: '🤝',  label: 'הצעות'   },
  { path: '/family',   icon: '👨‍👩‍👧‍👦', label: 'משפחה'  },
  { path: '/wall',     icon: '📝',  label: 'קיר'     },
  { path: '/events',   icon: '📅',  label: 'אירועים' },
  { path: '/profile',  icon: '👤',  label: 'פרופיל'  },
]

export default function BottomNav({ shelterCount = 0 }) {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: 480,
      background: '#ffffff',
      borderTop: '1px solid #e2e8f0',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      height: 64,
      zIndex: 1000,
      boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {tabs.map(tab => {
        const active = location.pathname === tab.path
        const isMap = tab.path === '/map'
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              background: 'none',
              padding: '6px 0',
              borderRadius: 8,
              position: 'relative',
            }}
          >
            {/* תג מקלט על כפתור המפה */}
            {isMap && shelterCount > 0 && (
              <span className="shelter-pulse" style={{
                position: 'absolute',
                top: 4,
                left: '50%',
                transform: 'translateX(8px)',
                background: '#dc2626',
                color: 'white',
                fontSize: 10,
                fontWeight: 800,
                width: 16,
                height: 16,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
              }}>
                {shelterCount}
              </span>
            )}
            <span style={{
              fontSize: active ? 22 : 19,
              transition: 'font-size 0.15s ease',
              filter: active ? 'none' : 'grayscale(60%) opacity(0.6)',
            }}>
              {tab.icon}
            </span>
            <span style={{
              fontSize: 10,
              fontWeight: active ? 700 : 400,
              color: active ? '#1e40af' : '#94a3b8',
            }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
