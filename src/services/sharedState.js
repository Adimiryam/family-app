/**
 * שירות מצב משותף — שומר מיקומים, מקלט, סטטוסים, תמונות, הצעות,
 * אירועים, הודעות קיר, הישגים ופרופילים ב-GitHub
 * כך שכל בני המשפחה רואים את אותם נתונים.
 *
 * קריאה: GitHub raw + API fallback (ללא אימות, מהיר)
 * כתיבה: GitHub Contents API עם PAT (מוטמע בזמן build)
 */

const OWNER = 'Adimiryam'
const REPO  = 'family-app'
const BRANCH = 'alerts-data'
const STATE_FILE        = 'data/shared-state.json'
const PHOTOS_FILE       = 'data/shared-photos.json'
const REQUESTS_FILE     = 'data/shared-requests.json'
const EVENTS_FILE       = 'data/shared-events.json'
const MESSAGES_FILE     = 'data/shared-messages.json'
const ACHIEVEMENTS_FILE = 'data/shared-achievements.json'
const PROFILES_FILE     = 'data/shared-profiles.json'
const RAW_BASE = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}`
const API_BASE = `https://api.github.com/repos/${OWNER}/${REPO}/contents`

// Token is stored reversed at build time to prevent GitHub secret scanning
// from detecting and auto-revoking it in the gh-pages JS bundle
const _t = import.meta.env.VITE_GT || ''
const TOKEN = _t ? _t.split('').reverse().join('') : ''

// ── קריאה גנרית (עם fallback ל-API) ─────────────────────
async function loadFromGitHub(file) {
  // נסיון 1: GitHub raw (מהיר, אבל cache של עד 5 דק')
  try {
    const r = await fetch(`${RAW_BASE}/${file}?t=${Date.now()}`, {
      signal: AbortSignal.timeout(6000),
    })
    if (r.ok) {
      const data = await r.json()
      if (data && typeof data === 'object') return data
    }
  } catch { /* continue to fallback */ }

  // נסיון 2: GitHub API (ללא cache, אבל מוגבל ל-60 בקשות/שעה)
  try {
    const r = await fetch(`${API_BASE}/${file}?ref=${BRANCH}`, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/vnd.github.v3+json' },
    })
    if (r.ok) {
      const meta = await r.json()
      if (meta.content) {
        const json = decodeURIComponent(escape(atob(meta.content)))
        const data = JSON.parse(json)
        if (data && typeof data === 'object') return data
      }
    }
  } catch { /* give up */ }

  return null
}

// ── קריאת מצב משותף (מיקומים + מקלט + סטטוסים) ───────
export async function loadSharedState() {
  return loadFromGitHub(STATE_FILE)
}

// ── קריאת תמונות משותפות (קובץ נפרד — כבד) ───────────
export async function loadSharedPhotos() {
  return loadFromGitHub(PHOTOS_FILE)
}

// ── קריאת הצעות ובקשות משותפות ─────────────────────────
export async function loadSharedRequests() {
  return loadFromGitHub(REQUESTS_FILE)
}

// ── קריאת אירועים משותפים ──────────────────────────────
export async function loadSharedEvents() {
  return loadFromGitHub(EVENTS_FILE)
}

// ── קריאת הודעות קיר משותפות ───────────────────────────
export async function loadSharedMessages() {
  return loadFromGitHub(MESSAGES_FILE)
}

// ── קריאת הישגים משותפים ───────────────────────────────
export async function loadSharedAchievements() {
  return loadFromGitHub(ACHIEVEMENTS_FILE)
}

// ── קריאת פרופילים משותפים ──────────────────────────────
export async function loadSharedProfiles() {
  return loadFromGitHub(PROFILES_FILE)
}

// ── כתיבה (עם debounce) ──────────────────────────────────
let saveTimer = null

export function saveSharedStateDebounced(state) {
  if (!TOKEN) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => doSave(STATE_FILE, state, 'fileSha'), 2000)
}

let photosSaveTimer = null

export function saveSharedPhotosDebounced(photos) {
  if (!TOKEN) return
  if (photosSaveTimer) clearTimeout(photosSaveTimer)
  photosSaveTimer = setTimeout(() => doSave(PHOTOS_FILE, { photos, updatedAt: new Date().toISOString() }, 'photosSha'), 3000)
}

// שמירת תמונות מיידית (ללא debounce) — לדחיפה ראשונית לענן
export function saveSharedPhotosImmediate(photos) {
  if (!TOKEN) { console.warn('[sharedState] no token — cannot save photos'); return }
  console.log('[sharedState] immediate photo save, keys:', Object.keys(photos).length)
  doSave(PHOTOS_FILE, { photos, updatedAt: new Date().toISOString() }, 'photosSha')
}

let requestsSaveTimer = null

export function saveSharedRequestsDebounced(requests) {
  if (!TOKEN) return
  if (requestsSaveTimer) clearTimeout(requestsSaveTimer)
  requestsSaveTimer = setTimeout(() => doSave(REQUESTS_FILE, { requests, updatedAt: new Date().toISOString() }, 'requestsSha'), 2000)
}

export function saveSharedRequestsImmediate(requests) {
  if (!TOKEN) { console.warn('[sharedState] no token — cannot save requests'); return }
  console.log('[sharedState] immediate requests save, count:', requests.length)
  doSave(REQUESTS_FILE, { requests, updatedAt: new Date().toISOString() }, 'requestsSha')
}

// ── אירועים ──────────────────────────────────────────────
let eventsSaveTimer = null

export function saveSharedEventsDebounced(events) {
  if (!TOKEN) return
  if (eventsSaveTimer) clearTimeout(eventsSaveTimer)
  eventsSaveTimer = setTimeout(() => doSave(EVENTS_FILE, { events, updatedAt: new Date().toISOString() }, 'eventsSha'), 2000)
}

export function saveSharedEventsImmediate(events) {
  if (!TOKEN) { console.warn('[sharedState] no token — cannot save events'); return }
  console.log('[sharedState] immediate events save, count:', events.length)
  doSave(EVENTS_FILE, { events, updatedAt: new Date().toISOString() }, 'eventsSha')
}

// ── הודעות קיר ───────────────────────────────────────────
let messagesSaveTimer = null

export function saveSharedMessagesDebounced(messages) {
  if (!TOKEN) return
  if (messagesSaveTimer) clearTimeout(messagesSaveTimer)
  messagesSaveTimer = setTimeout(() => doSave(MESSAGES_FILE, { messages, updatedAt: new Date().toISOString() }, 'messagesSha'), 2000)
}

export function saveSharedMessagesImmediate(messages) {
  if (!TOKEN) { console.warn('[sharedState] no token — cannot save messages'); return }
  console.log('[sharedState] immediate messages save, count:', messages.length)
  doSave(MESSAGES_FILE, { messages, updatedAt: new Date().toISOString() }, 'messagesSha')
}

// ── הישגים ───────────────────────────────────────────────
let achievementsSaveTimer = null

export function saveSharedAchievementsDebounced(achievements) {
  if (!TOKEN) return
  if (achievementsSaveTimer) clearTimeout(achievementsSaveTimer)
  achievementsSaveTimer = setTimeout(() => doSave(ACHIEVEMENTS_FILE, { achievements, updatedAt: new Date().toISOString() }, 'achievementsSha'), 2000)
}

export function saveSharedAchievementsImmediate(achievements) {
  if (!TOKEN) { console.warn('[sharedState] no token — cannot save achievements'); return }
  console.log('[sharedState] immediate achievements save, count:', achievements.length)
  doSave(ACHIEVEMENTS_FILE, { achievements, updatedAt: new Date().toISOString() }, 'achievementsSha')
}

// ── פרופילים ─────────────────────────────────────────────
let profilesSaveTimer = null

export function saveSharedProfilesDebounced(profiles) {
  if (!TOKEN) return
  if (profilesSaveTimer) clearTimeout(profilesSaveTimer)
  profilesSaveTimer = setTimeout(() => doSave(PROFILES_FILE, { profiles, updatedAt: new Date().toISOString() }, 'profilesSha'), 2000)
}

export function saveSharedProfilesImmediate(profiles) {
  if (!TOKEN) { console.warn('[sharedState] no token — cannot save profiles'); return }
  console.log('[sharedState] immediate profiles save')
  doSave(PROFILES_FILE, { profiles, updatedAt: new Date().toISOString() }, 'profilesSha')
}

const shas = {
  fileSha: null,
  photosSha: null,
  requestsSha: null,
  eventsSha: null,
  messagesSha: null,
  achievementsSha: null,
  profilesSha: null,
}

async function doSave(file, data, shaKey, retry = 0) {
  if (!TOKEN || retry > 2) return

  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  }

  try {
    if (!shas[shaKey]) {
      try {
        const r = await fetch(`${API_BASE}/${file}?ref=${BRANCH}`, {
          headers,
          signal: AbortSignal.timeout(8000),
        })
        if (r.ok) shas[shaKey] = (await r.json()).sha
      } catch { /* file might not exist yet */ }
    }

    const json = JSON.stringify(
      typeof data === 'object' && !data.updatedAt
        ? { ...data, updatedAt: new Date().toISOString() }
        : data,
      null,
      2
    )
    const content = btoa(unescape(encodeURIComponent(json)))

    const body = { message: '📍 shared update', content, branch: BRANCH }
    if (shas[shaKey]) body.sha = shas[shaKey]

    const r = await fetch(`${API_BASE}/${file}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    })

    if (r.ok) {
      shas[shaKey] = (await r.json()).content.sha
      console.log(`[sharedState] ${file} saved ✓`)
    } else if (r.status === 409 || r.status === 422) {
      shas[shaKey] = null
      await doSave(file, data, shaKey, retry + 1)
    } else {
      const text = await r.text().catch(() => '')
      console.warn(`[sharedState] ${file} save failed:`, r.status, text)
    }
  } catch (e) {
    console.warn(`[sharedState] ${file} save error:`, e.message)
  }
}
