import { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useUser } from '../App'
import { familyMembers, grandchildren, alertLevelConfig, WAR_START_DATE } from '../data/familyData'
import { LOCALITIES, localityCoords, SPECIAL_BASE, DEFAULT_LOCATION } from '../data/israeliLocalities'
import { getStatus } from '../data/statusConfig'
import { fetchCurrentAlert, fetchAlertsByPeriod, fetchMeta, normalizeCity } from '../services/pikudHaoref'
import { PERIODS, levelColors, levelRadius, calcSecurityLevel, formatDate, getHebrewDateParts, formatHebrewDate } from '../utils/mapUtils'
import InlineLocationPicker from '../components/map/InlineLocationPicker'
import EditLocationsModal from '../components/map/EditLocationsModal'
import FamilyList from '../components/map/FamilyList'

function MapController({ mapRef }) {
  const map = useMap()
  useEffect(() => { mapRef.current = map }, [map, mapRef])
  return null
}

function createPhotoIcon(people, photos, shelter) {
  const anyInShelter = people.some(p => shelter[p.id]?.active)
  const count = people.length
  const person = people[0]
  const photo = photos[person.id]
  const size = anyInShelter ? 48 : 42
  const borderColor = anyInShelter ? '#dc2626' : person.isGrandchild ? '#f59e0b' : person.military ? '#16a34a' : '#3b82f6'
  const borderWidth = anyInShelter ? 3 : 2.5
  const imgPart = photo
    ? `<img src="${photo}" style="width:100%;height:100%;object-fit:cover;display:block;" />`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#334155;color:white;font-size:${Math.round(size * 0.45)}px;">${person.emoji || '👤'}</div>`
  const badge = count > 1 ? `<div style="position:absolute;top:-5px;right:-5px;background:#1e40af;color:white;border-radius:50%;width:20px;height:20px;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);z-index:2;">${count}</div>` : ''
  const shelterBadge = anyInShelter ? `<div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);font-size:14px;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5));z-index:2;">🚨</div>` : ''
  const html = `<div style="position:relative;width:${size}px;height:${size}px;"><div style="width:${size}px;height:${size}px;border-radius:50%;border:${borderWidth}px solid ${borderColor};overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.35);">${imgPart}</div>${badge}${shelterBadge}</div>`
  return L.divIcon({ html, className: '', iconSize: [size+6,size+6], iconAnchor: [(size+6)/2,(size+6)/2], popupAnchor: [0,-(size/2+4)] })
}

export default function MapScreen() {
  const { currentUser, shelter, toggleShelter, photos, statuses, allMembers, locations: contextLocations, saveLocations: contextSaveLocations } = useUser()

  const isAdmin = currentUser?.id === 5

  const [period, setPeriod] = useState('today')
  const [showHeat, setShowHeat] = useState(true)
  const [showFamily, setShowFamily] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [liveAlert, setLiveAlert] = useState(null)
  const [realData, setRealData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState('mock')
  const [todayData, setTodayData] = useState({})
  const [todayLoaded, setTodayLoaded] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [dataMeta, setDataMeta] = useState(null)
  const [mapCollapsed, setMapCollapsed] = useState(false)
  const [focusedMemberId, setFocusedMemberId] = useState(null)
  const pollRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const familyListRef = useRef(null)
  const mapCollapsedRef = useRef(false)

  const now = new Date()

  useEffect(() => {
    const timer = setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize() }, 350)
    return () => clearTimeout(timer)
  }, [mapCollapsed])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const result = await fetchAlertsByPeriod(period)
      if (!cancelled) { setRealData(result.data); setDataSource(result.source === 'unavailable' ? 'mock' : 'real'); setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [period])

  useEffect(() => {
    fetchAlertsByPeriod('today').then(r => { setTodayData(r.data); setTodayLoaded(true) })
    fetchMeta().then(meta => { if (meta) setDataMeta(meta) })
  }, [])

  useEffect(() => {
    async function checkLive() { const alert = await fetchCurrentAlert(); setLiveAlert(alert) }
    checkLive()
    pollRef.current = setInterval(checkLive, 10_000)
    return () => clearInterval(pollRef.current)
  }, [])

  const handleFamilyScroll = useCallback((e) => {
    const scrollTop = e.target.scrollTop
    if (scrollTop > 20 && !mapCollapsedRef.current) { mapCollapsedRef.current = true; setMapCollapsed(true) }
    else if (scrollTop <= 5 && mapCollapsedRef.current) { mapCollapsedRef.current = false; setMapCollapsed(false) }
  }, [])

  const handleMemberClick = useCallback((member) => {
    setFocusedMemberId(prev => prev === member.id ? null : member.id)
    if (member.lat && member.lng && mapInstanceRef.current) {
      if (mapCollapsedRef.current) { mapCollapsedRef.current = false; setMapCollapsed(false) }
      if (familyListRef.current) familyListRef.current.scrollTop = 0
      setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.flyTo([member.lat, member.lng], 11, { duration: 0.8 }) }, 400)
    }
  }, [])

  const cityAlertData = realData || {}
  const heatCities = LOCALITIES.filter(c => cityAlertData[normalizeCity(c.name)])
  const locations = contextLocations
  const saveLocations = contextSaveLocations

  function resolveLocation(loc) {
    const city = loc?.city ?? null
    const isBase = city === SPECIAL_BASE.name
    const freshCoords = city ? localityCoords[city] : null
    return { city: city || null, lat: isBase ? SPECIAL_BASE.lat : (freshCoords?.lat ?? loc?.lat ?? DEFAULT_LOCATION.lat), lng: isBase ? SPECIAL_BASE.lng : (freshCoords?.lng ?? loc?.lng ?? DEFAULT_LOCATION.lng) }
  }

  const motherMap = {}
  grandchildren.filter(c => c.unborn).forEach(baby => {
    const motherName = baby.parents?.split(/\s*ו/)[0]?.trim()
    const mom = familyMembers.find(m => m.name === motherName)
    if (mom) motherMap[baby.id] = mom.id
  })

  function resolveUnbornLocation(baby) {
    const momId = motherMap[baby.id]
    if (momId && locations[momId]) return resolveLocation(locations[momId])
    return resolveLocation(locations[baby.id])
  }

  const membersData = familyMembers.map(m => ({ ...m, ...resolveLocation(locations[m.id]) }))
  const kidsData = grandchildren.filter(c => !c.unborn).map(c => ({ ...c, isGrandchild: true, ...resolveLocation(locations[c.id]) }))

  const allPeople = [
    ...familyMembers.map(m => ({ ...m, ...resolveLocation(locations[m.id]) })),
    ...grandchildren.filter(c => !c.unborn).map(c => ({ ...c, isGrandchild: true, ...resolveLocation(locations[c.id]) })),
    ...grandchildren.filter(c => c.unborn).map(c => ({ ...c, isGrandchild: true, isUnborn: true, ...resolveUnbornLocation(c) })),
  ]

  const shelterList = allMembers.filter(m => shelter[m.id]?.active)
  const familyAlertCities = new Set(allPeople.filter(p => p.city).map(p => normalizeCity(p.city)))
  const totalAlerts = [...familyAlertCities].reduce((s, nc) => s + (cityAlertData[nc]?.alerts || 0), 0)
  const currentUserCity = currentUser ? (locations[currentUser.id]?.city || null) : null
  const currentUserCityNorm = normalizeCity(currentUserCity)
  const familyCitiesUnique = [...new Set(allPeople.filter(p => p.city).map(p => normalizeCity(p.city)))]
  const alertsUser = currentUserCityNorm ? (cityAlertData[currentUserCityNorm]?.alerts || 0) : 0
  const shelterMinutesUser = currentUserCityNorm ? (cityAlertData[currentUserCityNorm]?.shelterMinutes || 0) : 0
  const alertsFamily = familyCitiesUnique.reduce((s, nc) => s + (cityAlertData[nc]?.alerts || 0), 0)
  const shelterMinutesFamily = familyCitiesUnique.reduce((s, nc) => s + (cityAlertData[nc]?.shelterMinutes || 0), 0)
  const securityLevel = calcSecurityLevel(alertsUser, !loading && todayLoaded)
  const periodLabels = { today: '24 שעות', all: 'כל הנתונים' }
  const periodLabel = periodLabels[period] || '24 שעות'

  let dataRangeLabel = ''
  if (dataMeta?.dataRange?.oldest) {
    const oldest = new Date(dataMeta.dataRange.oldest)
    dataRangeLabel = `מאז ${oldest.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}`
  }

  function formatShelterTime(minutes) {
    if (minutes === 0) return 'ללא אזעקות'
    if (minutes < 60) return `${minutes} דק'`
    return `${Math.floor(minutes / 60)}ש' ${minutes % 60}ד'`
  }

  const shelterTimeLabelUser = loading ? 'טוען...' : !currentUserCity ? 'הגדר מיקום' : formatShelterTime(shelterMinutesUser)
  const shelterTimeLabelFamily = loading ? 'טוען...' : formatShelterTime(shelterMinutesFamily)

  const handleInlineLocationSelect = (personId, locationData) => { saveLocations({ ...locations, [personId]: locationData }); setEditingId(null) }

  const hebrewParts = getHebrewDateParts(now)
  const hebrewDateStr = formatHebrewDate(now)
  function isShabbat(date) { const day = date.getDay(), hour = date.getHours(); return (day === 5 && hour >= 18) || (day === 6 && hour < 20) }
  function getHolidayGreeting(dayNum, monthName) {
    if (!dayNum || !monthName) return null
    const d = dayNum
    if (monthName.includes('ניסן') && d >= 15 && d <= 22) return 'חג פסח שמח! 🥓'
    if (monthName.includes('סיוון') && d >= 6 && d <= 7) return 'חג שבועות שמח! 🌾'
    if (monthName.includes('תשרי') && d >= 1 && d <= 2) return 'שנה טובה! 🍎🍯'
    if (monthName.includes('תשרי') && d === 10) return 'גמר חתימה טובה 🗖️'
    if (monthName.includes('תשרי') && d >= 15 && d <= 22) return 'חג סוכות שמח! 🌿'
    if (monthName.includes('תשרי') && d === 23) return 'שמחת תורה שמח! 📜'
    if (monthName.includes('כסלו') && d >= 25) return 'חנוכה שמח! 🕎'
    if (monthName.includes('טבת') && d <= 2) return 'חנוכה שמח! 🕎'
    if (monthName.includes('אדר') && d >= 14 && d <= 15) return 'פורים שמח! 🎭'
    return null
  }
  const shabbatNow = isShabbat(now)
  const holidayGreeting = getHolidayGreeting(hebrewParts.dayNum, hebrewParts.month)
  const greeting = holidayGreeting || (shabbatNow ? 'שבת שלום 🕯️' : null)
  const SWORDS_START = new Date('2023-10-07')
  const ROAR_START = new Date('2026-02-28')
  const daysSinceSwords = Math.floor((now - SWORDS_START) / (1000 * 60 * 60 * 24))
  const daysSinceRoar = Math.floor((now - ROAR_START) / (1000 * 60 * 60 * 24))

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {liveAlert && (
        <div className="shelter-pulse" style={{ background: 'linear-gradient(90deg, #7f1d1d, #dc2626)', color: 'white', padding: '10px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>🚨</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{liveAlert.title}</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>{Array.isArray(liveAlert.data) ? liveAlert.data.join(' · ') : liveAlert.data}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>{liveAlert.desc}</div>
          </div>
        </div>
      )}

      {shelterList.length > 0 && (
        <div className="shelter-pulse" style={{ background: 'linear-gradient(90deg, #dc2626, #b91c1c)', color: 'white', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 20 }}>🚨</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>{shelterList.map(m => m.name).join(', ')} — במקלט כרגע!</div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>{shelterList.length === 1 ? 'בן/בת משפחה אחד/ת' : `${shelterList.length} בני משפחה`} מדווחים על שהייה במקלט</div>
          </div>
        </div>
      )}

      {currentUser && (
        <button onClick={() => toggleShelter(currentUser.id, !shelter[currentUser.id]?.active)} className={shelter[currentUser.id]?.active ? 'shelter-pulse' : ''} style={{ margin: '6px 12px', padding: '10px 14px', borderRadius: 12, flexShrink: 0, background: shelter[currentUser.id]?.active ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'linear-gradient(135deg, #f1f5f9, #e2e8f0)', color: shelter[currentUser.id]?.active ? 'white' : '#475569', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: shelter[currentUser.id]?.active ? 'none' : '1.5px solid #cbd5e1', cursor: 'pointer' }}>
          <span style={{ fontSize: 18 }}>{shelter[currentUser.id]?.active ? '🚨' : '🏠'}</span>
          {shelter[currentUser.id]?.active ? 'אני במקלט כרגע!' : 'לחץ/י כשאת/ה במקלט'}
        </button>
      )}

      <div style={{ padding: '8px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexShrink: 0, direction: 'rtl', textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
          {now.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {hebrewDateStr}
        </div>
        {greeting && <div style={{ fontSize: 16, fontWeight: 800, color: shabbatNow ? '#7c3aed' : '#d97706', background: shabbatNow ? '#f5f3ff' : '#fffbeb', padding: '4px 16px', borderRadius: 20, display: 'inline-block', margin: '4px 0' }}>{greeting}</div>}
      </div>

      <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #1e40af)', padding: '12px 16px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 800, marginBottom: 1 }}>שלום, {currentUser?.name} 👋</h1>
          <p style={{ fontSize: 11, opacity: 0.8, marginBottom: 0 }}>🗺️ מפה ומדד הבטחון · נתוני פיקוד העורף</p>
          <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2, display: 'flex', gap: 12 }}>
            <span>⚔️ חרבות ברזל: יום {daysSinceSwords}</span>
            <span>🦁 שאגת הארי: יום {daysSinceRoar}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isAdmin && (
            <button onClick={() => setShowEdit(true)} style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '7px 12px', color: 'white', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer' }}>📍 עדכן מיקום</button>
          )}
          <div style={{ background: securityLevel.bg, borderRadius: 12, padding: '6px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: securityLevel.color, fontWeight: 700 }}>מדד בטחון</div>
            <div style={{ fontSize: 20 }}>{securityLevel.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: securityLevel.color }}>{securityLevel.label}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, padding: '8px 14px', background: 'white', borderBottom: '1px solid #e2e8f0', overflowX: 'auto', flexShrink: 0 }}>
        {PERIODS.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)} style={{ padding: '6px 12px', borderRadius: 20, whiteSpace: 'nowrap', background: period === p.key ? '#1e40af' : '#f1f5f9', color: period === p.key ? 'white' : '#475569', fontSize: 12, fontWeight: period === p.key ? 700 : 500, border: period === p.key ? 'none' : '1px solid #e2e8f0', flexShrink: 0, cursor: 'pointer' }}>
            {p.icon} {p.label}{p.key === 'all' && dataRangeLabel ? ` (${dataRangeLabel})` : ''}
          </button>
        ))}
        <div style={{ marginRight: 'auto', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, paddingRight: 4, color: loading ? '#94a3b8' : dataSource === 'real' ? '#16a34a' : '#d97706', fontWeight: 600 }}>
          {loading ? '⏳ טוען...' : dataSource === 'real' ? '✅ פיקוד העורף' : '⚠️ נתונים מדומים'}
        </div>
      </div>

      {/* מפה — מתכווצת לגמרי בגלילה */}
      <div style={{ height: mapCollapsed ? 0 : 220, transition: 'height 0.3s ease', position: 'relative', flexShrink: 0, overflow: 'hidden' }}>
        <MapContainer center={[31.5, 34.9]} zoom={7} style={{ height: 220, width: '100%' }} zoomControl={false} attributionControl={false}>
          <MapController mapRef={mapInstanceRef} />
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {showHeat && heatCities.map(city => {
            const data = cityAlertData[normalizeCity(city.name)]
            if (!data) return null
            return (<CircleMarker key={city.name} center={[city.lat, city.lng]} radius={levelRadius[data.level]} fillColor={levelColors[data.level]} color={levelColors[data.level]} weight={1} opacity={0.8} fillOpacity={0.35}><Tooltip direction="top"><span style={{ fontFamily: 'Heebo, Arial', direction: 'rtl', fontSize: 11 }}>{city.name}: {data.alerts} אזעקות</span></Tooltip></CircleMarker>)
          })}
          {showFamily && (() => {
            const grouped = {}
            const allWithCoords = [...membersData.filter(m => m.lat && m.lng), ...kidsData.filter(c => c.lat && c.lng)]
            for (const p of allWithCoords) {
              const type = p.isGrandchild ? 'kid' : 'adult'
              const key = `${type}_${p.lat.toFixed(4)},${p.lng.toFixed(4)}`
              if (!grouped[key]) grouped[key] = { lat: p.lat, lng: p.lng, people: [], isKidGroup: p.isGrandchild }
              grouped[key].people.push(p)
            }
            return Object.entries(grouped).map(([groupKey, { lat, lng, people, isKidGroup }]) => {
              const offsetLat = isKidGroup ? lat + 0.003 : lat
              const offsetLng = isKidGroup ? lng + 0.003 : lng
              const icon = createPhotoIcon(people, photos, shelter)
              return (
                <Marker key={groupKey} position={[offsetLat, offsetLng]} icon={icon}>
                  <Popup>
                    <div style={{ fontFamily: 'Heebo, Arial', direction: 'rtl', textAlign: 'right', fontSize: 13, minWidth: 140 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>📍 {people[0].city}</div>
                      {people.map(p => (<div key={p.id} style={{ marginBottom: 2 }}><strong>{p.name}</strong>{p.isUnborn ? ' 🤰' : p.isGrandchild ? ' 🧒' : ` — ${p.role}`}{shelter[p.id]?.active && <span style={{ color: '#dc2626', fontWeight: 700 }}> 🚨 במקלט!</span>}</div>))}
                      {people.length > 1 && <div style={{ marginTop: 4, fontSize: 11, color: '#64748b' }}>{people.length} אנשים במיקום זה</div>}
                    </div>
                  </Popup>
                </Marker>
              )
            })
          })()}
        </MapContainer>
        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 999, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button onClick={() => setShowHeat(!showHeat)} style={{ padding: '5px 9px', borderRadius: 7, background: showHeat ? '#dc2626' : 'white', color: showHeat ? 'white' : '#64748b', fontSize: 10, fontWeight: 600, boxShadow: '0 2px 6px rgba(0,0,0,0.15)', fontFamily: 'Heebo, Arial', border: 'none', cursor: 'pointer' }}>🔥 אזעקות</button>
          <button onClick={() => setShowFamily(!showFamily)} style={{ padding: '5px 9px', borderRadius: 7, background: showFamily ? '#3b82f6' : 'white', color: showFamily ? 'white' : '#64748b', fontSize: 10, fontWeight: 600, boxShadow: '0 2px 6px rgba(0,0,0,0.15)', fontFamily: 'Heebo, Arial', border: 'none', cursor: 'pointer' }}>👨‍👩‍👧 משפחה</button>
        </div>
        {!mapCollapsed && (
          <div style={{ position: 'absolute', bottom: 8, left: 8, zIndex: 999, background: 'rgba(255,255,255,0.93)', borderRadius: 8, padding: '5px 9px', fontSize: 10, boxShadow: '0 2px 6px rgba(0,0,0,0.15)', fontFamily: 'Heebo, Arial', direction: 'rtl' }}>
            {Object.entries(alertLevelConfig).map(([key, cfg]) => (<div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} /><span style={{ color: '#374151' }}>{cfg.label}</span></div>))}
          </div>
        )}
      </div>

      {/* אינדיקטור פתיחת מפה */}
      {mapCollapsed && (
        <div onClick={() => { mapCollapsedRef.current = false; setMapCollapsed(false); if (familyListRef.current) familyListRef.current.scrollTop = 0 }} style={{ padding: '6px', textAlign: 'center', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', cursor: 'pointer', flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6' }}>🗺️ הצג מפה ▼</span>
        </div>
      )}

      <FamilyList members={membersData} kids={kidsData} cityAlertData={cityAlertData} shelter={shelter} photos={photos} statuses={statuses} editingId={editingId} setEditingId={setEditingId} handleInlineLocationSelect={handleInlineLocationSelect} setShowEdit={setShowEdit} alertsUser={alertsUser} alertsFamily={alertsFamily} currentUserCity={currentUserCity} loading={loading} shelterTimeLabelUser={shelterTimeLabelUser} shelterTimeLabelFamily={shelterTimeLabelFamily} periodLabel={periodLabel} securityLevel={securityLevel} dataRangeLabel={dataRangeLabel} onScroll={handleFamilyScroll} onMemberClick={handleMemberClick} focusedMemberId={focusedMemberId} scrollRef={familyListRef} currentUserId={currentUser?.id} isAdmin={isAdmin} />

      {showEdit && isAdmin && (
        <EditLocationsModal
          currentUser={currentUser}
          locations={locations}
          onSave={saveLocations}
          onClose={() => setShowEdit(false)}
          cityAlertData={cityAlertData}
        />
      )}
    </div>
  )
}
