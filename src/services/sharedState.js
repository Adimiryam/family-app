/**
 * שירות מצב משותף — שומר מיקומים, מקלט, סטטוסים ותמונות ב-GitHub
 * כך שכל בני המשפחה רואים את אותם נתונים.
 *
 * קריאה: GitHub raw + API fallback (ללא אימות, מהיר)
 * כתיבה: GitHub Contents API עם PAT (מוטמע בזמן build)
 */

const OWNER = 'Adimiryam'
const REPO  = 'family-app'
const BRANCH = 'alerts-data'
const STATE_FILE  = 'data/shared-state.json'
const PHOTOS_FILE = 'data/shared-photos.json'
const RAW_BASE = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}`
const API_BASE = `https://api.github.com/repos/${OWNER}/${REPO}/contents`
const TOKEN  = import.meta.env.VITE_GITHUB_TOKEN || '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'

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

// ── כתיבה (עם debounce) ──────────────────────────────────
let fileSha = null
let saveTimer = null

export function saveSharedStateDebounced(state) {
  if (!TOKEN) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => doSave(STATE_FILE, state, 'fileSha'), 2000)
}

let photosSha = null
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

const shas = { fileSha: null, photosSha: null }

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
