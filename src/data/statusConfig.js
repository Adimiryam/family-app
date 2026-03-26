export const STATUSES = [
  { key: 'home',    label: 'בבית',       icon: '🏠', color: '#16a34a', bg: '#dcfce7' },
  { key: 'work',    label: 'בעבודה',     icon: '💼', color: '#1e40af', bg: '#eff6ff' },
  { key: 'army',    label: 'בצבא',       icon: '🎖️', color: '#15803d', bg: '#d1fae5' },
  { key: 'miluim',  label: 'במילואים',   icon: '🪖', color: '#92400e', bg: '#fef3c7' },
  { key: 'trip',    label: 'בטיול',      icon: '✈️', color: '#0369a1', bg: '#e0f2fe' },
  { key: 'inlaw',   label: 'אצל חמותי',  icon: '👵', color: '#7c3aed', bg: '#f5f3ff' },
]

export function getStatus(key) {
  return STATUSES.find(s => s.key === key) || null
}
