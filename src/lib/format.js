const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

export const montant = v => (v === '' || v == null ? '—' : euros.format(Number(v)))
export const jour = v => (v ? new Date(String(v).slice(0, 10) + 'T00:00:00').toLocaleDateString('fr-FR') : '—')
export const instant = v => (v ? new Date(v).toLocaleString('fr-FR') : '—')
export const libelle = (liste, v) => (liste.find(o => o.value === v) || {}).label || '—'
export const ou = v => (v === '' || v == null ? '—' : v)
export const masque = v => {
  const s = String(v || '').replace(/\s/g, '')
  return s ? '•••• ' + s.slice(-4) : '—'
}

// Nombre de jours entre aujourd'hui (minuit, heure locale) et une date ISO.
// Négatif si la date est passée.
export function joursAvant(iso) {
  if (!iso) return null
  const [a, m, j] = String(iso).slice(0, 10).split('-').map(Number)
  const cible = new Date(a, m - 1, j)
  const auj = new Date()
  auj.setHours(0, 0, 0, 0)
  return Math.round((cible - auj) / 86400000)
}
