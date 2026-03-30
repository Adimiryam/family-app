import { useState, useEffect } from 'react'
import { useUser } from '../App'
import { familyMembers, grandchildren } from '../data/familyData'
import { fetchAlertsByPeriod } from '../services/pikudHaoref'
import { MemberCard, GrandchildCard } from '../components/family/FamilyCards'

// ────────────────────────────────────────────────────────────
// מסך משפחה
// ────────────────────────────────────────────────────────────
export default function FamilyScreen() {
  const { shelter, photos, statuses, locations, saveLocations } = useUser()
  const [tab, setTab]           = useState('adults')
  const [alertData, setAlertData] = useState({ today: {}, yesterday: {}, week: {} })
  const [loading, setLoading]   = useState(true)
  const [editingId, setEditingId] = useState(null)

  const handleToggleEdit = (id) => setEditingId(prev => prev === id ? null : id)

  const handleSelectLocation = (memberId, locData) => {
    saveLocations({ ...locations, [memberId]: locData })
  }

  const defenders = familyMembers.filter(m => locations[m.id]?.city === 'בסיס כלשהו')
  const nonDefenders = familyMembers.filter(m => locations[m.id]?.city !== 'בסיס כלשהו')
  const shelterCount = Object.values(shelter).filter(s => s.active).length

  // שליפת נתוני אזעקות מפיקוד העורף
  useEffect(() => {
    async function load() {
      setLoading(true)
      const [today, yesterday, week] = await Promise.all([
        fetchAlertsByPeriod('today'),
        fetchAlertsByPeriod('yesterday'),
        fetchAlertsByPeriod('week'),
      ])
      setAlertData({
        today:     today.data     || {},
        yesterday: yesterday.data || {},
        week:      week.data      || {},
      })
      setLoading(false)
    }
    load()
  }, [])

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
          <p style={{ fontSize: 12, opacity: 0.85 }}>
            {familyMembers.length} מבוגרים · {grandchildren.length} נכדים
            {loading ? ' · טוען נתוני אזעקות...' : ' · נתוני פיקוד העורף'}
          </p>
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
            {defenders.length > 0 && (
              <>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 10, padding: '8px 12px',
                  background: '#dcfce7', borderRadius: 10, border: '1px solid #bbf7d0',
                }}>
                  <span style={{ fontSize: 18 }}>🪖</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>מגני המדינה</div>
                    <div style={{ fontSize: 11, color: '#16a34a' }}>
                      {defenders.map(m => m.name).join(' ו-')} — גאים בכם! 💚
                    </div>
                  </div>
                </div>
                {defenders.map(m => (
                  <MemberCard
                    key={m.id} member={m}
                    city={locations[m.id]?.city || null}
                    shelter={shelter} photo={photos[m.id]}
                    statusKey={statuses[m.id]}
                    alertData={alertData}
                    editingId={editingId}
                    onToggleEdit={handleToggleEdit}
                    onSelectLocation={handleSelectLocation}
                  />
                ))}
                <div style={{ height: 6 }} />
              </>
            )}
            {nonDefenders.map(m => (
              <MemberCard
                key={m.id} member={m}
                city={locations[m.id]?.city || null}
                shelter={shelter} photo={photos[m.id]}
                statusKey={statuses[m.id]}
                alertData={alertData}
                editingId={editingId}
                onToggleEdit={handleToggleEdit}
                onSelectLocation={handleSelectLocation}
              />
            ))}
          </>
        ) : tab === 'grandchildren' ? (
          <>
            <div style={{
              padding: '8px 12px', background: '#fef3c7', borderRadius: 10,
              border: '1px solid #fde68a', marginBottom: 14, textAlign: 'center',
            }}>
              <span style={{ fontSize: 14, color: '#92400e', fontWeight: 600 }}>
                ✨ {grandchildren.filter(c => !c.unborn).length} הנכדים האהובים שלנו!
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {grandchildren.filter(c => !c.unborn).map(child => (
                <GrandchildCard
                  key={child.id} child={child}
                  city={locations[child.id]?.city || null}
                  shelter={shelter} photo={photos[child.id]}
                  alertData={alertData}
                  editingId={editingId}
                  onToggleEdit={handleToggleEdit}
                  onSelectLocation={handleSelectLocation}
                />
              ))}
            </div>
            {/* עוברים בדרך */}
            {(() => {
              const unbornKids = grandchildren.filter(c => c.unborn && c.dueDate)
              if (unbornKids.length === 0) return null
              const today = new Date()
              return (
                <div style={{ marginTop: 16 }}>
                  <div style={{ padding: '8px 12px', background: '#fce7f3', borderRadius: 10, border: '1px solid #fbcfe8', marginBottom: 10, textAlign: 'center' }}>
                    <span style={{ fontSize: 14, color: '#9d174d', fontWeight: 600 }}>🤰 בדרך אלינו!</span>
                  </div>
                  {unbornKids.map(baby => {
                    const due = new Date(baby.dueDate)
                    const PREG = 280
                    const conception = new Date(due.getTime() - PREG * 86400000)
                    const elapsed = Math.floor((today - conception) / 86400000)
                    const progress = Math.min(100, Math.max(0, Math.round((elapsed / PREG) * 100)))
                    const weeks = Math.floor(elapsed / 7)
                    const months = Math.round(weeks / 4.33)
                    const daysLeft = Math.max(0, Math.floor((due - today) / 86400000))
                    return (
                      <div key={baby.id} style={{ background: 'white', borderRadius: 14, padding: '14px 16px', marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <span style={{ fontSize: 28 }}>{baby.emoji}</span>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{baby.name}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{baby.parents}</div>
                          </div>
                          <div style={{ marginRight: 'auto', textAlign: 'center' }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: '#ec4899' }}>{progress}%</div>
                            <div style={{ fontSize: 9, color: '#94a3b8' }}>טעינה</div>
                          </div>
                        </div>
                        <div style={{ background: '#f1f5f9', borderRadius: 10, height: 16, overflow: 'hidden', marginBottom: 6 }}>
                          <div style={{ height: '100%', borderRadius: 10, background: progress > 80 ? 'linear-gradient(90deg, #ec4899, #f43f5e)' : 'linear-gradient(90deg, #f9a8d4, #ec4899)', width: progress + '%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'white', fontWeight: 700 }}>
                            {progress > 15 ? progress + '%' : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b' }}>
                          <span>שבוע {weeks} (חודש {months})</span>
                          <span>עוד {daysLeft} ימים!</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </>
        ) : null}
      </div>
    </div>
  )
}
