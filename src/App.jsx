import { HashRouter as BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, useRef, createContext, useContext } from 'react'
import BottomNav from './components/BottomNav'
import MapScreen from './screens/MapScreen'
import RequestsScreen from './screens/RequestsScreen'
import FamilyScreen from './screens/FamilyScreen'
import FamilyWallScreen from './screens/FamilyWallScreen'
import EventsScreen from './screens/EventsScreen'
import ProfileScreen from './screens/ProfileScreen'
import AchievementsScreen from './screens/AchievementsScreen'
import LoginScreen from './screens/LoginScreen'
import { familyMembers } from './data/familyData'
import TopBar from './components/TopBar'
import { loadSharedState, loadSharedPhotos, saveSharedStateDebounced, saveSharedPhotosDebounced, saveSharedPhotosImmediate } from './services/sharedState'

export const UserContext = createContext(null)
export function useUser() { return useContext(UserContext) }

export default function App() {
  // ── משתמש נוכחי — תמיד מתחיל כ-null, חובה לבחור בכל כניסה ────────
  const [currentUser, setCurrentUser] = useState(null)

  // ── סטטוס מקלט: { [memberId]: { active: bool, since: isoString } } ──
  const [shelter, setShelter] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('familyapp_shelter') || '{}')
      const cleaned = {}
      for (const [k, v] of Object.entries(saved)) {
        cleaned[k] = (v?.active && !v?.since) ? { active: false } : v
      }
      return cleaned
    } catch { return {} }
  })

  // ── היסטוריית מקלט: { [memberId]: { date: 'YYYY-MM-DD', minutes: number } } ──
  const [shelterHistory, setShelterHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('familyapp_shelter_history') || '{}') } catch { return {} }
  })

  // ── תמונות: { [memberId]: base64String } ─────────────────
  const [photos, setPhotos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('familyapp_photos') || '{}') } catch { return {} }
  })

  // ── סטטוס: { [memberId]: statusKey } ─────────────────────
  const [statuses, setStatuses] = useState(() => {
    try { return JSON.parse(localStorage.getItem('familyapp_statuses') || '{}') } catch { return {} }
  })

  // ── מיקומים: { [memberId]: { city, lat, lng, updatedAt } } ───
  const [locations, setLocations] = useState(() => {
    try { return JSON.parse(localStorage.getItem('familyapp_locations') || '{}') } catch { return {} }
  })

  // ── ref לגישה למצב העדכני מתוך callbacks ──────────────────
  const stateRef = useRef({ locations: {}, shelter: {}, statuses: {}, shelterHistory: {} })
  useEffect(() => {
    stateRef.current = { locations, shelter, statuses, shelterHistory }
  }, [locations, shelter, statuses, shelterHistory])

  // ── סנכרון ענן — טעינה בעלייה + polling כל 30 שניות ────────
  useEffect(() => {
    // טעינה ראשונית: מצב משותף (מיקומים + מקלט + סטטוסים + היסטוריית מקלט)
    loadSharedState().then(shared => {
      if (!shared) {
        const local = stateRef.current
        if (Object.keys(local.locations).length > 0) {
          syncToCloud(local)
        }
        return
      }
      if (shared.locations && Object.keys(shared.locations).length > 0) {
        const merged = { ...stateRef.current.locations, ...shared.locations }
        setLocations(merged)
        try { localStorage.setItem('familyapp_locations', JSON.stringify(merged)) } catch {}
      }
      if (shared.shelter && Object.keys(shared.shelter).length > 0) {
        const merged = { ...stateRef.current.shelter, ...shared.shelter }
        setShelter(merged)
        try { localStorage.setItem('familyapp_shelter', JSON.stringify(merged)) } catch {}
      }
      if (shared.statuses && Object.keys(shared.statuses).length > 0) {
        const merged = { ...stateRef.current.statuses, ...shared.statuses }
        setStatuses(merged)
        try { localStorage.setItem('familyapp_statuses', JSON.stringify(merged)) } catch {}
      }
      if (shared.shelterHistory && Object.keys(shared.shelterHistory).length > 0) {
        const merged = { ...stateRef.current.shelterHistory, ...shared.shelterHistory }
        setShelterHistory(merged)
        try { localStorage.setItem('familyapp_shelter_history', JSON.stringify(merged)) } catch {}
      }
    })

    // טעינה ראשונית: תמונות (קובץ נפרד, כבד יותר)
    loadSharedPhotos().then(shared => {
      if (!shared || !shared.photos) {
        // ענן ריק — אם יש תמונות מקומיות, דוחפים אותן לענן מיד
        try {
          const localPhotos = JSON.parse(localStorage.getItem('familyapp_photos') || '{}')
          if (Object.keys(localPhotos).length > 0) {
            console.log('[App] cloud photos empty, pushing local photos:', Object.keys(localPhotos).length)
            saveSharedPhotosImmediate(localPhotos)
          }
        } catch {}
        return
      }
      // ענן לא ריק — ממזגים ענן + מקומי, ואם יש תמונות מקומיות חדשות — דוחפים חזרה
      const localPhotos = (() => {
        try { return JSON.parse(localStorage.getItem('familyapp_photos') || '{}') } catch { return {} }
      })()
      const merged = { ...localPhotos, ...shared.photos }
      // בודקים אם יש תמונות מקומיות שלא קיימות בענן
      const localKeys = Object.keys(localPhotos)
      const cloudKeys = Object.keys(shared.photos)
      const newLocalKeys = localKeys.filter(k => !cloudKeys.includes(k))
      if (newLocalKeys.length > 0) {
        console.log('[App] found local photos not in cloud, pushing merged:', newLocalKeys.length, 'new keys')
        saveSharedPhotosImmediate(merged)
      }
      if (Object.keys(merged).length > 0) {
        setPhotos(merged)
        try { localStorage.setItem('familyapp_photos', JSON.stringify(merged)) } catch {}
      }
    })

    // polling כל 30 שניות — מצב משותף
    const interval = setInterval(async () => {
      const shared = await loadSharedState()
      if (!shared) return
      if (shared.locations) {
        setLocations(prev => {
          const merged = { ...prev, ...shared.locations }
          try { localStorage.setItem('familyapp_locations', JSON.stringify(merged)) } catch {}
          return merged
        })
      }
      if (shared.shelter) {
        setShelter(prev => {
          const merged = { ...prev, ...shared.shelter }
          try { localStorage.setItem('familyapp_shelter', JSON.stringify(merged)) } catch {}
          return merged
        })
      }
      if (shared.statuses) {
        setStatuses(prev => {
          const merged = { ...prev, ...shared.statuses }
          try { localStorage.setItem('familyapp_statuses', JSON.stringify(merged)) } catch {}
          return merged
        })
      }
      if (shared.shelterHistory) {
        setShelterHistory(prev => {
          const merged = { ...prev, ...shared.shelterHistory }
          try { localStorage.setItem('familyapp_shelter_history', JSON.stringify(merged)) } catch {}
          return merged
        })
      }
    }, 30000)

    // polling תמונות כל 2 דקות (פחות תכוף כי זה קובץ כבד)
    const photosInterval = setInterval(async () => {
      const shared = await loadSharedPhotos()
      if (!shared || !shared.photos) return
      setPhotos(prev => {
        const merged = { ...prev, ...shared.photos }
        try { localStorage.setItem('familyapp_photos', JSON.stringify(merged)) } catch {}
        return merged
      })
    }, 120000)

    return () => {
      clearInterval(interval)
      clearInterval(photosInterval)
    }
  }, [])

  // ── helpers — שליחה לענן ─────────────────────────────────
  function syncToCloud(overrides = {}) {
    saveSharedStateDebounced({ ...stateRef.current, ...overrides })
  }

  function syncPhotosToCloud(updatedPhotos) {
    saveSharedPhotosDebounced(updatedPhotos)
  }

  const saveLocations = (updated) => {
    setLocations(updated)
    try {
      localStorage.setItem('familyapp_locations', JSON.stringify(updated))
    } catch (e) {
      console.warn('שגיאה בשמירת מיקומים ל-localStorage:', e)
      try {
        localStorage.removeItem('familyapp_photos')
        localStorage.setItem('familyapp_locations', JSON.stringify(updated))
      } catch {
        console.warn('לא ניתן לשמור מיקומים גם אחרי ניקוי תמונות')
      }
    }
    syncToCloud({ locations: updated })
  }

  const setMemberStatus = (memberId, statusKey) => {
    const updated = { ...statuses, [memberId]: statusKey }
    setStatuses(updated)
    localStorage.setItem('familyapp_statuses', JSON.stringify(updated))
    syncToCloud({ statuses: updated })
  }

  const login = (member) => {
    setCurrentUser(member)
  }

  const logout = () => {
    setCurrentUser(null)
  }

  const toggleShelter = (memberId, active) => {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    // כשיוצאים ממקלט — שומרים את משך הזמן
    let newHistory = shelterHistory
    if (!active && shelter[memberId]?.active && shelter[memberId]?.since) {
      const mins = Math.max(0, Math.round((now - new Date(shelter[memberId].since)) / 60000))
      const prev = (shelterHistory[memberId]?.date === todayStr) ? (shelterHistory[memberId].minutes || 0) : 0
      newHistory = { ...shelterHistory, [memberId]: { date: todayStr, minutes: prev + mins } }
      setShelterHistory(newHistory)
      localStorage.setItem('familyapp_shelter_history', JSON.stringify(newHistory))
    }

    const updated = {
      ...shelter,
      [memberId]: active ? { active: true, since: now.toISOString() } : { active: false },
    }
    setShelter(updated)
    localStorage.setItem('familyapp_shelter', JSON.stringify(updated))
    syncToCloud({ shelter: updated, shelterHistory: newHistory })
  }

  const savePhoto = (memberId, base64) => {
    const updated = { ...photos, [memberId]: base64 }
    setPhotos(updated)
    try { localStorage.setItem('familyapp_photos', JSON.stringify(updated)) }
    catch { console.warn('תמונה גדולה מדי לשמירה') }
    syncPhotosToCloud(updated)
  }

  const shelterCount = Object.values(shelter).filter(s => s.active).length

  return (
    <UserContext.Provider value={{
      currentUser, login, logout,
      allMembers: familyMembers,
      shelter, toggleShelter, shelterCount, shelterHistory,
      photos, savePhoto,
      statuses, setMemberStatus,
      locations, saveLocations,
    }}>
      <BrowserRouter>
        <div style={{
          height: '100dvh',
          display: 'flex', flexDirection: 'column',
          background: '#f0f4f8',
          maxWidth: 480, margin: '0 auto',
          position: 'relative', overflow: 'hidden',
        }}>
          {!currentUser ? (
            <LoginScreen />
          ) : (
            <>
              <TopBar />
              <div style={{ flex: 1, overflow: 'hidden', paddingBottom: 64 }}>
                <Routes>
                  <Route path="/"              element={<Navigate to="/map" />} />
                  <Route path="/map"           element={<MapScreen />} />
                  <Route path="/requests"      element={<RequestsScreen />} />
                  <Route path="/family"        element={<FamilyScreen />} />
                  <Route path="/wall"          element={<FamilyWallScreen />} />
                  <Route path="/events"        element={<EventsScreen />} />
                  <Route path="/achievements"  element={<AchievementsScreen />} />
                  <Route path="/profile"       element={<ProfileScreen />} />
                  <Route path="*"              element={<Navigate to="/map" />} />
                </Routes>
              </div>
              <BottomNav shelterCount={shelterCount} />
            </>
          )}
        </div>
      </BrowserRouter>
    </UserContext.Provider>
  )
}
