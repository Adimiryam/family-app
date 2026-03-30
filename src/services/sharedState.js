/**
 * שירות מצב משותף — שומר מיקומים, מקלט וסטטוסים ב-GitHub
 * כך שכל בני המשפחה רואים את אותם נתונים.
 *
 * קריאה: GitHub raw (ללא אימות, מהיר)
 * כתיבה: GitHub Contents API עם PAT (מוטמע בזמן build)
 */

const OWNER = 'Adimiryam'
const REPO  = 'family-app'
const BRANCH = 'alerts-data'
const FILE   = 'data/shared-state.json'
const RAW_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${FILE}`
const API_URL = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`
const TOKEN  = import.meta.env.VITE_GITHUB_TOKEN || ''

// ── קריאה ────────────────────────────────────────────────────
export async function loadSharedState() {
  try {
    const r = await fetch(`${RAW_URL}?t=${Date.now()}`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

// ── כתיבה (עם debounce) ──────────────────────────────────────
let fileSha = null
let saveTimer = null

export function saveSharedStateDebounced(state) {
  if (!TOKEN) {
    console.warn('[sharedState] No VITE_GITHUB_TOKEN — cloud sync disabled')
    return
  }
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => doSave(state), 2000)
}

async function doSave(state, retry = 0) {
  if (!TOKEN || retry > 2) return

  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  }

  try {
    // צריך SHA כדי לעדכן קובץ קיים
    if (!fileSha) {
      try {
        const r = await fetch(`${API_URL}?ref=${BRANCH}`, {
          headers,
          signal: AbortSignal.timeout(8000),
        })
        if (r.ok) fileSha = (await r.json()).sha
      } catch { /* file might not exist yet */ }
    }

    const json = JSON.stringify(
      { ...state, updatedAt: new Date().toISOString() },
      null,
      2
    )
    // btoa doesn't handle Unicode — encode first
    const content = btoa(unescape(encodeURIComponent(json)))

    const body = { message: '📍 shared state', content, branch: BRANCH }
    if (fileSha) body.sha = fileSha

    const r = await fetch(API_URL, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })

    if (r.ok) {
      fileSha = (await r.json()).content.sha
      console.log('[sharedState] saved to cloud ✓')
    } else if (r.status === 409 || r.status === 422) {
      // SHA conflict — retry with fresh SHA
      console.log('[sharedState] SHA conflict, retrying...')
      fileSha = null
      await doSave(state, retry + 1)
    } else {
      console.warn('[sharedState] save failed:', r.status)
    }
  } catch (e) {
    console.warn('[sharedState] save error:', e.message)
  }
}
