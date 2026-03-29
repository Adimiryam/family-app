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
function toGimmatria(n) {
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט']
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ']
  const hundreds = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת']

  if (n >= 1000) return ''
  if (n < 1) return ''

  const h = Math.floor(n / 100)
  const t = Math.floor((n % 100) / 10)
  const o = n % 10

  let result = hundreds[h] + tens[t] + ones[o]
  return result.replace(/([א-ת])([א-ת])$/, '$1\u05F3$2')
}

function getPicDisplay(pic) {
  if (!pic) return ''
  const [lat, lon] = pic.split(',').map(Number)
  return `${lat.toFixed(2)}, ${lon.toFixed(2)}`
}

function getColorForAlerts(count, threshold = 1) {
  if (count === 0) return '#16a34a'  // Green
  if (count < threshold * 2) return '#d97706'  // Orange
  return '#dc2626'  // Red
}

function getTimeStr(mins) {
  if (mins < 1) return 'עכשיו'
  if (mins < 60) return `לפני ${Math.floor(mins)}d`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `לפני ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `לפני ${days}d`
  const weeks = Math.floor(days / 7)
  return `לפני ${weeks}w`
}

function MapScreen() {
  const { user } = useUser()
  const [locations, setLocations] = useState({})
  const [cityAlertData, setCityAlertData] = useState({})
  const [todayAlertData, setTodayAlertData] = useState({})
  const [dataLoaded, setDataLoaded] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showEdit, setShowEdit] = useState(false)
  const [mapCenter, setMapCenter] = useState([31.73, 35.19])
  const [mapZoom, setMapZoom] = useState(7)
  const mapRef = useRef(null)

  // Load locations from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCATIONS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setLocations(parsed)
      }
    } catch (err) {
      console.error('Error loading locations:', err)
    }
  }, [])

  // Load alert data
  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const [current, history] = await Promise.all([
          fetchCurrentAlert(),
          fetchAlertsByPeriod('sinceWar')
        ])
        setTodayAlertData(current || {})
        setCityAlertData(history || {})
      } catch (err) {
        console.error('Error loading alerts:', err)
      } finally {
        setDataLoaded(true)
      }
    }
    loadAlerts()
  }, [])

  // Get all people to display
  const allPeople = [
    ...familyMembers.map(m => ({ name: m.hebrewName, id: m.id, isMember: true })),
    ...grandchildren.map(g => ({ name: g.hebrewName, id: g.id, isMember: false }))
  ]

  // Handle location update
  const handleLocationChange = (id, value) => {
    setLocations(prev => ({
      ...prev,
      [id]: value
    }))
  }

  // Handle inline location select - FIXED: Always use fresh coordinates from localityCoords
  const handleInlineLocationSelect = (id, locationName) => {
    const coords = localityCoords[locationName]
    if (coords) {
      setLocations(prev => ({
        ...prev,
        [id]: locationName
      }))
    }
    setEditingId(null)
  }

  // Save locations - FIXED: Never store raw coordinates in localStorage
  const saveLocations = (newLocations) => {
    setLocations(newLocations)
    localStorage.setItem(LOCATIONS_KEY, JSON.stringify(newLocations))
    setShowEdit(false)
  }

  // Build location data for map display
  const locationDisplay = {
    centers: [],
    markers: []
  }

  // Add each person's location - FIXED: Always retrieve coordinates from localityCoords, not from localStorage
  for (const person of allPeople) {
    const locationName = locations[person.id]
    if (!locationName) continue

    // CRITICAL FIX: Always get fresh coordinates from localityCoords instead of relying on stale localStorage data
    const coords = localityCoords[locationName]
    if (!coords) continue

    const [lat, lon] = coords
    const alerts = cityAlertData[locationName] || { alerts: 0 }
    const color = getColorForAlerts(alerts.alerts)

    locationDisplay.markers.push({
      id: person.id,
      lat,
      lon,
      name: person.name,
      location: locationName,
      alerts: alerts.alerts,
      color,
      lastAlert: alerts.lastAlert
    })

    // For clustering centers
    const count = locationDisplay.centers.filter(c => c.lat === lat && c.lon === lon).length
    if (count === 0) {
      locationDisplay.centers.push({ lat, lon, count: 1, color })
    }
  }

  // Calculate map center from fresh coordinates
  if (locationDisplay.markers.length > 0) {
    const avgLat = locationDisplay.markers.reduce((sum, m) => sum + m.lat, 0) / locationDisplay.markers.length
    const avgLon = locationDisplay.markers.reduce((sum, m) => sum + m.lon, 0) / locationDisplay.markers.length
    setMapCenter([avgLat, avgLon])
    setMapZoom(locationDisplay.markers.length > 3 ? 8 : 9)
  }

  const securityLevel = calcSecurityLevel(todayAlertData, dataLoaded)

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">
          <span className="text-3xl mr-2">{securityLevel.icon}</span>
          מפת משפחה
        </h1>
        <button
          onClick={() => setShowEdit(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-medium"
        >
          עדכון מיקומים
        </button>
      </div>

      {/* Status bar */}
      <div
        className="p-3 text-center font-semibold text-white"
        style={{ backgroundColor: securityLevel.color }}
      >
        {securityLevel.label}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {dataLoaded ? (
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="w-full h-full"
            ref={mapRef}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap'
            />
            {locationDisplay.markers.map(marker => (
              <CircleMarker
                key={marker.id}
                center={[marker.lat, marker.lon]}
                radius={levelRadius[marker.alerts > 10 ? 'critical' : marker.alerts > 5 ? 'high' : marker.alerts > 0 ? 'medium' : 'low']}
                fillColor={marker.color}
                color={marker.color}
                weight={2}
                opacity={0.8}
                fillOpacity={0.6}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>{marker.name}</strong>
                    <br />
                    {marker.location}
                    <br />
                    התראות: {marker.alerts}
                    {marker.lastAlert && (
                      <>
                        <br />
                        אחרונה: {formatDate(marker.lastAlert)}
                      </>
                    )}
                  </div>
                </Popup>
                <Tooltip>
                  {marker.name} - {marker.location}
                </Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>טוען נתונים...</p>
          </div>
        )}
      </div>

      {/* Locations List */}
      <div className="bg-gray-50 border-t border-gray-200 max-h-1/3 overflow-y-auto">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">מיקומים</h2>
          {allPeople.map(person => {
            const locationName = locations[person.id]
            const alerts = cityAlertData[locationName] || { alerts: 0 }

            return (
              <div key={person.id} className="mb-3 p-3 bg-white rounded border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-gray-800">{person.name}</p>
                    <p className="text-sm text-gray-600">{locationName || 'לא הוגדר'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium" style={{ color: getColorForAlerts(alerts.alerts) }}>
                      {alerts.alerts} התראות
                    </span>
                  </div>
                </div>

                {editingId === person.id ? (
                  <div className="mt-2 border-t pt-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="חיפוש עיר..."
                        autoFocus
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        list={`localities-${person.id}`}
                        onChange={(e) => handleLocationChange(person.id, e.target.value)}
                      />
                      <datalist id={`localities-${person.id}`}>
                        {LOCALITIES_SORTED.map(loc => (
                          <option key={loc.name} value={loc.name} />
                        ))}
                      </datalist>
                      <button
                        onClick={() => handleInlineLocationSelect(person.id, locations[person.id] || '')}
                        className="mt-1 w-full text-sm bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded"
                      >
                        חדשכן
                      </button>
                    </div>
                    <LocationSelector
                      localities={LOCALITIES_SORTED}
                      selected={locationName}
                      onSelect={handleInlineLocationSelect}
                      onClose={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingId(person.id)}
                    className="mt-2 w-full text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 px-2 py-1 rounded"
                  >
                    ערוך מיקום
                  </button>
                )}
              </div>
            )
          })}

          {/* Placeholder for location selector that appears when editing */}
          {editingId && (
            <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
              <LocationSelectorInline
                localities={LOCALITIES_SORTED}
                selected={locations[editingId] || ''}
                onSelect={(id, location) => {
                  handleInlineLocationSelect(editingId, location)
                  setEditingId(null)
                }}
                onClose={() => setEditingId(null)}
              />
            </div>
          )}
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

// Placeholder component for LocationSelector
function LocationSelector({ localities, selected, onSelect, onClose }) {
  return (
    <div className="mt-2 p-2 bg-gray-100 rounded">
      <p className="text-xs text-gray-600 mb-2">בחר עיר מהרשימה</p>
      <div className="grid grid-cols-3 gap-2">
        {localities.slice(0, 12).map(loc => (
          <button
            key={loc.name}
            onClick={() => onSelect(loc.name)}
            className={`text-xs p-1 rounded ${
              selected === loc.name
                ? 'bg-blue-500 text-white'
                : 'bg-white border border-gray-300 hover:border-blue-500'
            }`}
          >
            {loc.name}
          </button>
        ))}
      </div>
    </div>
  )
}

// Placeholder component for LocationSelectorInline
function LocationSelectorInline({ localities, selected, onSelect, onClose }) {
  return (
    <div>
      <input
        type="text"
        placeholder="חיפוש עיר..."
        defaultValue={selected}
        autoFocus
        className="w-full px-3 py-2 border border-gray-300 rounded mb-2"
        list="inline-localities"
      />
      <datalist id="inline-localities">
        {localities.map(loc => (
          <option key={loc.name} value={loc.name} />
        ))}
      </datalist>
      <button
        onClick={onClose}
        className="w-full text-sm bg-gray-300 hover:bg-gray-400 text-gray-800 px-2 py-1 rounded"
      >
        בטל
      </button>
    </div>
  )
}

// Placeholder for EditLocationsModal
function EditLocationsModal({ allPeople, locations, onSave, onClose, cityAlertData }) {
  const [newLocations, setNewLocations] = useState(locations)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">עדכון מיקומים</h2>
        {allPeople.map(person => (
          <div key={person.id} className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {person.name}
            </label>
            <select
              value={newLocations[person.id] || ''}
              onChange={(e) => setNewLocations(prev => ({
                ...prev,
                [person.id]: e.target.value
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="">-- בחר עיר --</option>
              {LOCALITIES_SORTED.map(loc => (
                <option key={loc.name} value={loc.name}>{loc.name}</option>
              ))}
            </select>
          </div>
        ))}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded"
          >
            ביטול
          </button>
          <button
            onClick={() => onSave(newLocations)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
          >
            שמור
          </button>
        </div>
      </div>
    </div>
  )
}

export default MapScreen