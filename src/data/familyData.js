// ============================================================
// נתוני המשפחה
// ============================================================

export const familyMembers = [
  { id: 1,  name: 'נועם',      role: 'אבא',      military: false, emoji: '👨‍🦳' },
  { id: 2,  name: 'יעל',      role: 'אמא',      military: false, emoji: '👩‍🦳' },
  { id: 3,  name: 'רועי',      role: 'אח',       military: false, emoji: '👨'   },
  { id: 4,  name: 'צביה',     role: 'גיסה',     military: false, emoji: '👩'   },
  { id: 5,  name: 'עדי',      role: 'אחות',     military: false, emoji: '👩‍🦱' },
  { id: 6,  name: 'יצחק',     role: 'גיס',      military: false, emoji: '👨‍🦱' },
  { id: 7,  name: 'בועז',     role: 'אח',       military: false, emoji: '👨'   },
  { id: 8,  name: 'צפיה',     role: 'גיסה',     military: false, emoji: '👩'   },
  { id: 9,  name: 'עמית',     role: 'אח',       military: false, emoji: '👨'   },
  { id: 10, name: 'יהב',      role: 'גיסה',     military: false, emoji: '👩'   },
  { id: 11, name: 'עינת',     role: 'אחות',     military: false, emoji: '👩'   },
  { id: 12, name: 'רז',       role: 'גיס',      military: false, emoji: '👨'   },
  { id: 13, name: 'עטרה',     role: 'אחות',     military: false, emoji: '👩'   },
  { id: 14, name: 'יוסף',     role: 'גיס',      military: false, emoji: '👨'   },
  { id: 15, name: 'אלישע',    role: 'צבא',      military: true,  emoji: '🪖'   },
  { id: 16, name: 'טליה',     role: 'צבא',      military: true,  emoji: '🪖'   },
  { id: 17, name: 'שובי בארי', role: 'אחיינית', military: false, emoji: '👩'   },
]

export const grandchildren = [
  { id: 104, name: 'עברי בן ציון', emoji: '👦', parents: 'רועי וצביה'  },
  { id: 109, name: 'דרור',         emoji: '👧', parents: 'רועי וצביה'  },
  { id: 105, name: 'שגיא',         emoji: '👦', parents: 'בועז וצפיה'  },
  { id: 110, name: 'שחר',          emoji: '👧', parents: 'בועז וצפיה'  },
  { id: 102, name: 'דריה',         emoji: '👧', parents: 'עינת ורז'    },
  { id: 103, name: 'שיר',          emoji: '👧', parents: 'עינת ורז'    },
  { id: 106, name: 'עומר',         emoji: '👧', parents: 'עינת ורז'    },
  { id: 107, name: 'אלה',          emoji: '👧', parents: 'עטרה ויוסף'  },
  { id: 108, name: 'נווה',         emoji: '👧', parents: 'יהב ועמית'   },
  { id: 201, name: 'העוברון של עינת', emoji: '🤰', parents: 'עינת ורז', unborn: true, dueDate: '2026-09-10' },
  { id: 202, name: 'העוברון של עטרה', emoji: '🤰', parents: 'עטרה ויוסף', unborn: true, dueDate: '2026-05-07' },
]

// ────────────────────────────────────────────────────────────
// נתוני אזעקות לפי תקופה (מדומה — יחובר לפיקוד העורף אמיתי)
// תאריך תחילת המלחמה: 28.02.2026
// ────────────────────────────────────────────────────────────

export const WAR_START_DATE = '28/02/2026'
export const SWORDS_OF_IRON_DATE = '2023-10-07' // חרבות ברזל
export const ROAR_OF_LION_DATE = '2026-02-28' // שאגת הארי (same as WAR_START_DATE)

// עוזר לחישוב רמה לפי מספר אזעקות
function level(n) {
  if (n === 0) return 'low'
  if (n <= 3)  return 'low'
  if (n <= 10) return 'medium'
  if (n <= 25) return 'high'
  return 'critical'
}
function mk(alerts, minsPerAlert = 3) {
  return { alerts, shelterMinutes: alerts * minsPerAlert, level: level(alerts) }
}

// אין נתונים מדומים — הכל מגיע מפיקוד העורף בלבד
export const cityAlertDataByPeriod = { today: {}, yesterday: {}, week: {}, sinceWar: {} }

export const cityAlertData = {}

export const alertLevelConfig = {
  low:      { color: '#16a34a', bg: '#dcfce7', label: 'נמוך',   icon: '🟢' },
  medium:   { color: '#d97706', bg: '#fef3c7', label: 'בינוני', icon: '🟡' },
  high:     { color: '#dc2626', bg: '#fee2e2', label: 'גבוה',   icon: '🔴' },
  critical: { color: '#7f1d1d', bg: '#fecaca', label: 'קריטי',  icon: '🚨' },
}

// ============================================================
// הצעות ובקשות
// ============================================================
export const initialRequests = [
  {
    id: 1, type: 'request', category: 'בייביסיטר',
    title: 'צריכים בייביסיטר לחתונה 💒',
    description: 'אנחנו הולכים לחתונת חברים ב-15 לאפריל וצריכים מישהו לשמור על הילדים',
    author: 'עינת', date: '15/04/2026', hours: '18:00 - 23:30', numKids: 2,
    signedUp: [], createdAt: '2026-03-20',
  },
  {
    id: 2, type: 'offer', category: 'שיעורים פרטיים',
    title: 'שיעורים פרטיים באנגלית 📚',
    description: 'אני מציעה שיעורים פרטיים באנגלית לכל הגילאים. ניסיון של 10 שנים בהוראה',
    author: 'עטרה', price: '80 ₪ לשעה', interested: [], createdAt: '2026-03-15',
  },
  {
    id: 3, type: 'offer', category: 'עזרה כללית',
    title: 'זמין לעזרה עם מעבר דירה 📦',
    description: 'אם מישהו צריך עזרה עם מעבר דירה, אני זמין בסופי שבוע',
    author: 'רועי', interested: [], createdAt: '2026-03-18',
  },
]

// ============================================================
// הישגים
// ============================================================
export const initialAchievements = [
  { id: 1, text: 'נווה נגמלה מחיתולים! 🎉', author: 'יהב', likes: ['עדי', 'יעל'], createdAt: '2026-03-15' },
  { id: 2, text: 'דרור התחילה ללכת! 👣', author: 'צביה', likes: ['נועם', 'יעל', 'עדי'], createdAt: '2026-03-10' },
  { id: 3, text: 'שיר ציון עזרה לאמא לטפל בעומר 💕', author: 'עינת', likes: ['יעל', 'רועי'], createdAt: '2026-03-20' },
  { id: 4, text: 'ברכות לטליה לרגל חזרתו של אורי לארץ! 🇮🇱🎊', author: 'עדי', likes: ['נועם', 'יעל', 'רועי', 'צביה', 'בועז'], createdAt: '2026-03-25' },
]

// ============================================================
// אירועים קרובים
// ============================================================
export const initialEvents = [
  {
    id: 1, title: 'שבת משפחתית 🕍', date: '05/04/2026', time: '12:00',
    location: 'בית נועם ויעל, פסגות',
    description: 'שבת חגיגית עם כל המשפחה! אוכל טעים, שיחות, שמחה',
    tasks: [
      { id: 1, name: 'הכנת עוגה', assignedTo: null },
      { id: 2, name: 'סלט ירקות', assignedTo: null },
      { id: 3, name: 'תכנון פעילות לילדים', assignedTo: null },
      { id: 4, name: 'קניות', assignedTo: null },
      { id: 5, name: 'הגעה מוקדמת לעזור', assignedTo: null },
    ],
    attending: [], notAttending: [], color: '#1e40af', emoji: '🕍',
  },
  {
    id: 2, title: 'מסיבת הודיה 🎉', date: '02/05/2026', time: '19:00',
    location: 'גן האירועים "הגן הירוק", הרצליה',
    description: 'חוגגים ומודים על כל הטוב! ערב מיוחד לכל המשפחה',
    tasks: [
      { id: 1, name: 'הכנת עוגה', assignedTo: null },
      { id: 2, name: 'קישוטים', assignedTo: null },
      { id: 3, name: 'מוזיקה והפעלה', assignedTo: null },
      { id: 4, name: 'ממתקים לילדים', assignedTo: null },
      { id: 5, name: 'צילום', assignedTo: null },
      { id: 6, name: 'תיאום הסעות', assignedTo: null },
    ],
    attending: [], notAttending: [], color: '#7c3aed', emoji: '🎉',
  },
]