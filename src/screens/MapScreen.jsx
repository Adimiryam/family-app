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
function toGematria(num) {
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט']
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ']
  const hundreds = ['', 'ק', 'ר', 'ש', 'ת']

  if (num === 0) return '0'
  if (num > 999) return num.toString()

  let result = ''
  const h = Math.floor(num / 100)
  const t = Math.floor((num % 100) / 10)
  const o = num % 10

  if (h > 0) result += hundreds[h]
  if (t > 0) result += tens[t]
  if (o > 0) result += ones[o]

  return result
}

const MapScreen = () => {
  const { user } = useUser()
  const [locations, setLocations] = useState({})
  const [allPeople, setAllPeople] = useState([])
  const [showEdit, setShowEdit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [cityAlertData, setCityAlertData] = useState({})
  const [selectedPeriod, setSelectedPeriod] = useState('today')
  const [dataLoaded, setDataLoaded] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingInlineLocation, setEditingInlineLocation] = useState(null)
  const mapRef = useRef(null)

  // Load locations from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(LOCATIONS_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setLocations(parsed)
      } catch (e) {
        console.error('Failed to parse stored locations:', e)
      }
    }
  }, [])

  // Initialize people from familyData
  useEffect(() => {
    const people = [...familyMembers, ...grandchildren]
    setAllPeople(people)
  }, [])

  // Fetch alert data based on selected period
  useEffect(() => {
    setLoading(true)
    setDataLoaded(false)

    const fetchAlerts = async () => {
      try {
        let alerts = {}

        if (selectedPeriod === 'today') {
          const now = new Date()
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
          alerts = await fetchAlertsByPeriod(todayStart, todayEnd)
        } else if (selectedPeriod === 'yesterday') {
          const now = new Date()
          const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          const yesterdayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
          const yesterdayEnd = new Date(yesterdayStart.getTime() + 24 * 60 * 60 * 1000)
          alerts = await fetchAlertsByPeriod(yesterdayStart, yesterdayEnd)
        } else if (selectedPeriod === 'week') {
          const now = new Date()
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          alerts = await fetchAlertsByPeriod(weekAgo, now)
        } else if (selectedPeriod === 'sinceWar') {
          const warStart = new Date(WAR_START_DATE)
          const now = new Date()
          alerts = await fetchAlertsByPeriod(warStart, now)
        }

        setCityAlertData(alerts)
        setDataLoaded(true)
      } catch (error) {
        console.error('Error fetching alerts:', error)
        setDataLoaded(true)
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
  }, [selectedPeriod])

  const getLocationData = (personId) => {
    return locations[personId] || null
  }

  const handleInlineLocationSelect = (personId, locality) => {
    const coords = localityCoords[locality] || DEFAULT_LOCATION
    setLocations(prev => ({
      ...prev,
      [personId]: {
        locality,
        latitude: coords.latitude,
        longitude: coords.longitude,
        timestamp: new Date().toISOString()
      }
    }))
    setEditingInlineLocation(null)
  }

  const saveLocations = (newLocations) => {
    setLocations(newLocations)
    localStorage.setItem(LOCATIONS_KEY, JSON.stringify(newLocations))
    setShowEdit(false)
  }

  const getMarkerInfo = (location) => {
    if (!location) return { color: '#94a3b8', radius: 12, label: '?' }
    
    const locality = location.locality
    const alertData = cityAlertData[locality]
    
    if (!alertData) return { color: '#94a3b8', radius: 12, label: '?' }
    if (alertData.alerts === 0) return { color: '#16a34a', radius: 12, label: '✓' }
    
    const alertLevel = alertLevelConfig.find(level => alertData.alerts >= level.minAlerts)?.level
    if (!alertLevel) return { color: '#94a3b8', radius: 12, label: '?' }
    
    return {
      color: levelColors[alertLevel] || '#94a3b8',
      radius: levelRadius[alertLevel] || 12,
      label: toGematria(alertData.alerts)
    }
  }

  const securityLevel = calcSecurityLevel(cityAlertData, dataLoaded)

  // Collect all unique coordinates for map centering
  const coordinates = []
  allPeople.forEach(person => {
    const locData = getLocationData(person.id)
    if (locData && locData.latitude && locData.longitude) {
      coordinates.push([locData.latitude, locData.longitude])
    }
  })

  // Use first location or default if no locations
  const mapCenter = coordinates.length > 0 ? coordinates[0] : [DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude]
  const mapZoom = coordinates.length > 0 ? 10 : 8

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="px-3 py-1 rounded-full text-sm font-semibold"
              style={{ backgroundColor: securityLevel.bg, color: securityLevel.color }}
            >
              {securityLevel.icon} {securityLevel.label}
            </div>
          </div>
          <button
            onClick={() => setShowEdit(true)}
            className="px-3 py-1 rounded bg-white text-blue-600 hover:bg-blue-100 text-sm font-medium transition"
          >
            עריכה
          </button>
        </div>

        {/* Period selector */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {PERIODS.map(period => (
            <button
              key={period.key}
              onClick={() => setSelectedPeriod(period.key)}
              className={`px-3 py-1 rounded whitespace-nowrap text-sm transition ${
                selectedPeriod === period.key
                  ? 'bg-white text-blue-600 font-semibold'
                  : 'bg-blue-500 text-white hover:bg-blue-400'
              }`}
            >
              {period.icon} {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative bg-gray-100">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-slate-900 z-10">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-300 border-t-blue-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">טוען נתונים...</p>
            </div>
          </div>
        ) : (
          <MapContainer
            ref={mapRef}
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            {allPeople.map(person => {
              const locData = getLocationData(person.id)
              if (!locData) return null

              const markerInfo = getMarkerInfo(locData)
              const statusInfo = getStatus(person.id)

              return (
                <CircleMarker
                  key={person.id}
                  center={[locData.latitude, locData.longitude]}
                  radius={markerInfo.radius}
                  fillColor={markerInfo.color}
                  color={markerInfo.color}
                  weight={2}
                  opacity={0.8}
                  fillOpacity={0.7}
                >
                  <Popup>
                    <div className="text-center p-2 font-semibold text-gray-900">
                      <div>{person.name}</div>
                      <div className="text-xs text-gray-600 mt-1">{locData.locality}</div>
                      {statusInfo?.status && (
                        <div className="text-xs mt-1 p-1 rounded" style={{ backgroundColor: statusInfo.statusColor }}>
                          {statusInfo.status}
                        </div>
                      )}
                      {locData.timestamp && (
                        <div className="text-xs text-gray-500 mt-1">{formatDate(locData.timestamp)}</div>
                      )}
                    </div>
                  </Popup>
                  <Tooltip>{person.name}</Tooltip>
                </CircleMarker>
              )
            })}
          </MapContainer>
        )}
      </div>

      {/* Locations sidebar */}
      <div className="h-64 border-t border-gray-200 dark:border-slate-700 overflow-y-auto bg-white dark:bg-slate-900">
        <div className="p-4">
          {allPeople.map(person => {
            const locData = getLocationData(person.id)
            const statusInfo = getStatus(person.id)

            return (
              <div key={person.id} className="mb-3 pb-3 border-b border-gray-200 dark:border-slate-700 last:border-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-gray-900 dark:text-white">{person.name}</div>
                  <div className="flex gap-1">
                    {statusInfo?.statusColor && (
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: statusInfo.statusColor }}
                        title={statusInfo.status}
                      ></div>
                    )}
                  </div>
                </div>
                {locData ? (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <div className="font-medium text-gray-700 dark:text-gray-300">{locData.locality}</div>
                    {locData.timestamp && (
                      <div className="text-xs text-gray-500 dark:text-gray-500">{formatDate(locData.timestamp)}</div>
                    )}
                    <button
                      onClick={() => setEditingId(editingId === person.id ? null : person.id)}
                      className="text-blue-600 dark:text-blue-400 hover:underline text-xs mt-1"
                    >
                      {editingId === person.id ? 'ביטול' : 'שנה'}
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400 italic">לא הוגדר מיקום</div>
                )}
                {editingId === person.id && (
                  <div className="mt-2 p-2 bg-gray-100 dark:bg-slate-800 rounded">
                    <LocationSelector
                      selectedLocality={locData?.locality}
                      onSelect={handleInlineLocationSelect}
                      personId={person.id}
                      onSelect={handleInlineLocationSelect}
                      onClose={() => setEditingId(null)}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {showEdit && (
        <EditLocationsModal
          allPeople={allPeople}
          locations={locations}
          onSave={saveLocations}
          onClose={() => setShowEdit(false)}
          cityAlertData={cityAlertData}
        />
      )}
    </div>
  )
}

function LocationSelector({ selectedLocality, onSelect, personId, onClose }) {
  const [search, setSearch] = useState('')

  const filtered = search
    ? LOCALITIES_SORTED.filter(l =>
        l.name.includes(search) || l.name.includes(search.split('').reverse().join(''))
      )
    : LOCALITIES_SORTED.slice(0, 10)

  return (
    <div className="bg-white dark:bg-slate-800 rounded border border-gray-300 dark:border-slate-600">
      <input
        type="text"
        placeholder="חפש עיר..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-3 py-2 border-b border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none"
      />
      <div className="max-h-40 overflow-y-auto">
        {filtered.map(locality => (
          <button
            key={locality.name}
            onClick={() => {
              onSelect(personId, locality.name)
              setSearch('')
            }}
            className={`w-full text-right px-3 py-2 text-sm hover:bg-blue-100 dark:hover:bg-slate-700 border-b border-gray-200 dark:border-slate-700 last:border-0 ${
              selectedLocality === locality.name ? 'bg-blue-50 dark:bg-slate-700 font-semibold text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-300'
            }`}
          >
            {locality.name}
          </button>
        ))}
      </div>
    </div>
  )
}

function EditLocationsModal({ allPeople, locations, onSave, onClose, cityAlertData }) {
  const [localLocations, setLocalLocations] = useState(locations)
  const [expandedPerson, setExpandedPerson] = useState(null)

  const handleLocationSelect = (personId, locality) => {
    const coords = localityCoords[locality] || DEFAULT_LOCATION
    setLocalLocations(prev => ({
      ...prev,
      [personId]: {
        locality,
        latitude: coords.latitude,
        longitude: coords.longitude,
        timestamp: new Date().toISOString()
      }
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl max-w-md w-full mx-4 max-h-96 flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">עדכון מיקומים</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            {allPeople.map(person => (
              <div key={person.id} className="mb-3">
                <button
                  onClick={() => setExpandedPerson(expandedPerson === person.id ? null : person.id)}
                  className="w-full text-right px-3 py-2 rounded bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 font-medium text-gray-900 dark:text-white"
                >
                  {person.name} {expandedPerson === person.id ? '▼' : '▶'}
                </button>
                {expandedPerson === person.id && (
                  <div className="mt-2 p-2 bg-gray-50 dark:bg-slate-700 rounded">
                    <LocationSelector
                      selectedLocality={localLocations[person.id]?.locality}
                      personId={person.id}
                      onSelect={handleLocationSelect}
                      onClose={() => setEditingId(null)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-300 dark:bg-slate-600 text-gray-900 dark:text-white rounded font-medium hover:bg-gray-400 dark:hover:bg-slate-500"
          >
            ביטול
          </button>
          <button
            onClick={() => onSave(localLocations)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
          >
            שמור
          </button>
        </div>
      </div>
    </div>
  )
}

export default MapScreen