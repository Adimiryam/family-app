import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet'
import { useUser } from '../App'
import { familyMembers, grandchildren, alertLevelConfig, WAR_START_DATE } from '../data/familyData'
import { LOCALITIES, localityCoords, SPECIAL_BASE, DEFAULT_LOCATION } from '../data/israeliLocalities'
import { getStatus } from '../data/statusConfig'
import { fetchCurrentAlert, fetchAlertsByPeriod } from '../services/pikudHaoref'

const LOCATIONS_KEY = 'familyapp_locations'
const LOCALITIES_SORTED = [...LOCALITIES].sort((a, b) => a.name.localeCompare(b.name, 'he'))

const PERIODS = [
  { key: 'today',    label: 'היום',              icon: '📅' },
  { key: 'yesterday',label: 'אתמול',             icon: '📅' },
  { key: 'week',     label: '7 ימים',            icon: '🗓️' },
  { key: 'sinceWar', label: `מ-${WAR_START_DATE}`, icon: '⚔️' },
]
const levelColors = { low: '#16a34a', medium: '#d97706', high: '#dc2626', critical: '#7c0000' }
const levelRadius = { low: 12, medium: 18, high: 24, critical: 32 }

function calcSecurityLevel(todayAlertData, dataLoaded) {
  if (!dataLoaded) return { color: '#94a3b8', bg: '#f1f5f9', label: 'אין מידע', icon: '⚪' }
  const citiesWithAlerts = Object.values(todayAlertData).filter(d => d.alerts > 0).length
  if (citiesWithAlerts === 0) return { color: '#16a34a', bg: '#dcfce7', label: 'בטוח',  icon: '🟢' }
  if (citiesWithAlerts <= 5)  return { color: '#d97706', bg: '#fef3c7', label: 'זהירות', icon: '🟡' }
  return                             { color: '#dc2626', bg: '#fee2e2', label: 'מוגבר',  icon: '🔴' }
}

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// ────────────────────────────────────────────────────────────
// המרת מספר לגימטריה עברית
// ────────────────────────────────────────────────────────────
function hebrewGematria(num) {
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט']
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ']
  const hundreds = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק']

  if (num === 0) return '0'
  if (num >= 10000) return num.toString()

  let result = ''
  if (num >= 100) {
    result += hundreds[Math.floor(num / 100)]
    num %= 100
  }
  if (num >= 10) {
    if (num === 15 || num === 16) {
      result += ones[9] + ones[num - 9]
    } else {
      result += tens[Math.floor(num / 10)] + ones[num % 10]
    }
  } else if (num > 0) {
    result += ones[num]
  }

  return result
}

function MapScreen() {
  const { user } = useUser()
  const [locations, setLocations] = useState({})
  const [alerts, setAlerts] = useState({})
  const [selectedPeriod, setSelectedPeriod] = useState('today')
  const [dataLoaded, setDataLoaded] = useState(false)
  const [stats, setStats] = useState({ cities: 0, alerts: 0 })
  const mapRef = useRef()

  useEffect(() => {
    const savedLocations = localStorage.getItem(LOCATIONS_KEY)
    if (savedLocations) {
      const parsed = JSON.parse(savedLocations)
      setLocations(parsed)
    }
  }, [])

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        if (selectedPeriod === 'today') {
          const data = await fetchCurrentAlert()
          const alertsByCity = {}
          data.forEach(alert => {
            const cityName = alert.data[0] || 'לא זהוי'
            alertsByCity[cityName] = (alertsByCity[cityName] || 0) + 1
          })
          setAlerts(alertsByCity)
        } else if (selectedPeriod === 'yesterday') {
          const data = await fetchAlertsByPeriod({ days: 1, until: new Date() })
          const alertsByCity = {}
          data.forEach(alert => {
            const cityName = alert.data[0] || 'לא זהוי'
            alertsByCity[cityName] = (alertsByCity[cityName] || 0) + 1
          })
          setAlerts(alertsByCity)
        } else if (selectedPeriod === 'week') {
          const data = await fetchAlertsByPeriod({ days: 7 })
          const alertsByCity = {}
          data.forEach(alert => {
            const cityName = alert.data[0] || 'לא זהוי'
            alertsByCity[cityName] = (alertsByCity[cityName] || 0) + 1
          })
          setAlerts(alertsByCity)
        } else if (selectedPeriod === 'sinceWar') {
          const data = await fetchAlertsByPeriod({ startDate: WAR_START_DATE })
          const alertsByCity = {}
          data.forEach(alert => {
            const cityName = alert.data[0] || 'לא זהוי'
            alertsByCity[cityName] = (alertsByCity[cityName] || 0) + 1
          })
          setAlerts(alertsByCity)
        }
        setDataLoaded(true)
      } catch (error) {
        console.error('Failed to fetch alerts:', error)
        setDataLoaded(true)
      }
    }

    loadAlerts()
  }, [selectedPeriod])

  useEffect(() => {
    const citiesWithAlerts = Object.values(alerts).filter(count => count > 0).length
    const totalAlerts = Object.values(alerts).reduce((a, b) => a + b, 0)
    setStats({ cities: citiesWithAlerts, alerts: totalAlerts })
  }, [alerts])

  const securityLevel = calcSecurityLevel(alerts, dataLoaded)

  const handleMapLocationSelect = (coords, cityName) => {
    const newLocations = { ...locations, [user.id]: { coords, cityName, timestamp: new Date().toISOString() } }
    setLocations(newLocations)
    localStorage.setItem(LOCATIONS_KEY, JSON.stringify(newLocations))
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      maxWidth: 480,
      margin: '0 auto',
      background: '#ffffff',
      paddingBottom: 64,
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        background: securityLevel.bg,
        borderBottom: `3px solid ${securityLevel.color}`,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: securityLevel.color }}>
          {securityLevel.icon} {securityLevel.label}
        </div>
      </div>

      {/* Period Selector */}
      <div style={{
        display: 'flex',
        gap: 6,
        padding: '8px 8px',
        overflowX: 'auto',
        borderBottom: '1px solid #e2e8f0',
        background: '#f8fafc',
      }}>
        {PERIODS.map(period => (
          <button
            key={period.key}
            onClick={() => setSelectedPeriod(period.key)}
            style={{
              flex: '0 0 auto',
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: selectedPeriod === period.key ? 700 : 400,
              color: selectedPeriod === period.key ? '#1e40af' : '#64748b',
              background: selectedPeriod === period.key ? '#e0e7ff' : 'transparent',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {period.icon} {period.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
        padding: '12px 8px',
        background: '#f1f5f9',
        borderBottom: '1px solid #e2e8f0',
      }}>
        <div style={{
          padding: '8px',
          textAlign: 'center',
          background: '#ffffff',
          borderRadius: 8,
          fontSize: 12,
        }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#475569' }}>{stats.cities}</div>
          <div style={{ fontSize: 10, color: '#94a3b8' }}>ערים</div>
        </div>
        <div style={{
          padding: '8px',
          textAlign: 'center',
          background: '#ffffff',
          borderRadius: 8,
          fontSize: 12,
        }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626' }}>{stats.alerts}</div>
          <div style={{ fontSize: 10, color: '#94a3b8' }}>התראות</div>
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {typeof window !== 'undefined' && (
          <MapContainer
            center={DEFAULT_LOCATION}
            zoom={8}
            style={{ height: '100%', width: '100%' }}\n            ref={mapRef}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
            />

            {/* Family members on map */}
            {Object.entries(locations).map(([memberId, location]) => {
              const member = familyMembers.find(m => m.id === memberId)
              return (
                <CircleMarker
                  key={`member-${memberId}`}
                  center={location.coords}
                  radius={10}
                  fillColor="#3b82f6"
                  color="#1e40af"
                  weight={2}
                  opacity={0.8}
                  fillOpacity={0.7}
                >
                  <Popup>
                    <div style={{ textAlign: 'center', minWidth: 150 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{member?.name || 'Unknown'}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{location.cityName}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{formatDate(location.timestamp)}</div>
                    </div>
                  </Popup>
                  <Tooltip>{member?.name}</Tooltip>
                </CircleMarker>
              )
            })}

            {/* Grandchildren indicators */}
            {grandchildren.map((child, idx) => {
              const coords = localityCoords[child.location] || DEFAULT_LOCATION
              const isResponsible = locations[user.id]?.cityName === child.location
              return (
                <CircleMarker
                  key={`grandchild-${idx}`}
                  center={coords}
                  radius={8}
                  fillColor={isResponsible ? '#10b981' : '#8b5cf6'}
                  color={isResponsible ? '#047857' : '#6d28d9'}
                  weight={2}
                  opacity={0.8}
                  fillOpacity={0.6}
                >
                  <Popup>
                    <div style={{ textAlign: 'center', minWidth: 150 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{child.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{child.location}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{isResponsible ? 'אני אחראי' : 'אחר אחראי'}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}

            {/* Alert circles for cities */}
            {Object.entries(alerts).filter(([_, count]) => count > 0).map(([cityName, count]) => {
              const coords = localityCoords[cityName]
              if (!coords) return null
              const level = Object.entries(alertLevelConfig).find(([_, config]) => count >= config.threshold)?.[0] || 'low'
              return (
                <CircleMarker
                  key={`alert-${cityName}`}
                  center={coords}
                  radius={levelRadius[level] || 12}
                  fillColor={levelColors[level] || '#16a34a'}
                  color={levelColors[level] || '#16a34a'}
                  weight={2}
                  opacity={0.6}
                  fillOpacity={0.3}
                >
                  <Popup>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{cityName}</div>
                      <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>{count} התראות</div>
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}
          </MapContainer>
        )}
      </div>
    </div>
  )
}

export default MapScreen