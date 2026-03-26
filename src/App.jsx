import { HashRouter as BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, createContext, useContext } from 'react'
import BottomNav from './components/BottomNav'
import MapScreen from './screens/MapScreen'
import RequestsScreen from './screens/RequestsScreen'
import FamilyScreen from './screens/FamilyScreen'
import EventsScreen from './screens/EventsScreen'
import ProfileScreen from './screens/ProfileScreen'
import LoginScreen from './screens/LoginScreen'
import { familyMembers } from './data/familyData'
import TopBar from './components/TopBar'

export const UserContext = createContext(null)
export function useUser() { return useContext(UserContext) }

export default function App() {
  // ── משתמש נוכחי — תמיד מתחיל כ-null, חובה לבחור בכל כניסה ────────
  const [currentUser, setCurrentUser] = useState(null)

  // ── סטטוס מקלט: { [memberId]: { active: bool, since: isoString } } ──
  const [shelter, setShelter] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('familyapp_shelter') || '{}')
      // נקה ערכים ישנים שסומנו active ללא since (פורמט ישן)
      const cleaned = {}
      for (const [k, v] of Object.entries(saved)) {
        cleaned[k] = (v?.active && !v?.since) ? { active: false } : v
      }
      return cleaned
    } catch { return {} }
  })

  // ── היסטוריית ממד: { [memberId]: { date: 'YYYY-MM-DD', minutes: number } } ──
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

  const saveLocations = (updated) => {
    setLocations(updated)
    try {
      localStorage.setItem('familyapp_locations', JSON.stringify(updated))
    } catch (e) {
      console.warn('שגיאה בשמירת מיקומים ל-localStorage:', e)
      // ניסיון לפנות מקום – מנקים תמונות ומנסים שוב
      try {
        localStorage.removeItem('familyapp_photos')
        localStorage.setItem('familyapp_locations', JSON.stringify(updated))
      } catch {
        console.warn('לא ניתן לשמור מיקומים גם אחרי ניקוי תמונות')
      }
    }
  }

  const setMemberStatus = (memberId, statusKey) => {
    const updated = { ...statuses, [memberId]: statusKey }
    setStatuses(updated)
    localStorage.setItem('familyapp_statuses', JSON.stringify(updated))
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
  }

  const savePhoto = (memberId, base64) => {
    const updated = { ...photos, [memberId]: base64 }
    setPhotos(updated)
    try { localStorage.setItem('familyapp_photos', JSON.stringify(updated)) }
    catch { console.warn('תמונה גדולה מדי לשמירה') }
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
                  <Route path="/"         element={<Navigate to="/map" />} />
                  <Route path="/map"      element={<MapScreen />} />
                  <Route path="/requests" element={<RequestsScreen />} />
                  <Route path="/family"   element={<FamilyScreen />} />
                  <Route path="/events"   element={<EventsScreen />} />
                  <Route path="/profile"  element={<ProfileScreen />} />
                  <Route path="*"         element={<Navigate to="/map" />} />
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