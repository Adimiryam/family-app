import { useState } from 'react'
import { useUser } from '../App'
import { familyMembers, grandchildren, cityAlertData, alertLevelConfig } from '../data/familyData'
import { getStatus } from '../data/statusConfig'

function MemberCard({ member, shelter, photo, statusKey }) {
  const status = getStatus(statusKey)
  const cityData = cityAlertData[member.city]
  const level    = cityData ? alertLevelConfig[cityData.level] : null
  const inShelter = shelter[member.id]?.active

  return (
    <div style={{
      background: 'white',
      borderRadius: 14,
      padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: inShelter ? '0 0 0 2px #dc2626' : '0 1px 4px rgba(0,0,0,0.07)',
      marginBottom: 10,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* פס מקלט */}
      {inShelter && (
        <div style={{
          position: 'absolute', top: 0, right: 0, left: 0,
          height: 3,
          background: 'linear-gradient(90deg, #dc2626, #ef4444)',
        }} />
      )}

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
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{member.name}</span>
          <span style={{
            fontSize: 10, padding: '2px 7px', borderRadius: 20,
            background: member.military ? '#dcfce7' : '#eff6ff',
            color: member.military ? '#15803d' : '#1e40af', fontWeight: 600,
          }}>
            {member.role}
          </span>
        </div>

        {inShelter ? (
          <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 700, marginTop: 2 }}>
            🚨 במקלט כרגע
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            <span>📍 {member.city}</span>
            {level && (
              <span style={{ background: level.bg, color: level.color, fontSize: 10, padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>
                {level.icon} {cityData.alerts}
              </span>
            )}
            {status && (
              <span style={{ background: status.bg, color: status.color, fontSize: 10, padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>
                {status.icon} {status.label}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function GrandchildCard({ child, shelter, photo }) {
  const inShelter = shelter[child.id]?.active
  return (
    <div style={{
      background: 'white', borderRadius: 12,
      padding: '12px 10px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
      boxShadow: inShelter ? '0 0 0 2px #dc2626' : '0 1px 4px rgba(0,0,0,0.07)',
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
      {inShelter && <span className="shelter-pulse" style={{ fontSize: 12 }}>🚨</span>}
    </div>
  )
}

export default function FamilyScreen() {
  const { shelter, photos, statuses } = useUser()
  const [tab, setTab] = useState('adults')

  const adults   = familyMembers.filter(m => !m.military)
  const military = familyMembers.filter(m => m.military)
  const shelterCount = Object.values(shelter).filter(s => s.active).length

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
          <p style={{ fontSize: 12, opacity: 0.85 }}>{familyMembers.length} מבוגרים · {grandchildren.length} נכדים</p>
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
            {/* בצבא */}
            {military.length > 0 && (
              <>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 10, padding: '8px 12px',
                  background: '#dcfce7', borderRadius: 10, border: '1px solid #bbf7d0',
                }}>
                  <span style={{ fontSize: 18 }}>🪖</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>שומרי הגבול</div>
                    <div style={{ fontSize: 11, color: '#16a34a' }}>
                      {military.map(m => m.name).join(' ו-')} — גאים בכם! 💚
                    </div>
                  </div>
                </div>
                {military.map(m => <MemberCard key={m.id} member={m} shelter={shelter} photo={photos[m.id]} statusKey={statuses[m.id]} />)}
                <div style={{ height: 6 }} />
              </>
            )}
            {adults.map(m => <MemberCard key={m.id} member={m} shelter={shelter} photo={photos[m.id]} statusKey={statuses[m.id]} />)}
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
                <GrandchildCard key={child.id} child={child} shelter={shelter} photo={photos[child.id]} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
