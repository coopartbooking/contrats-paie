export const CATEGORIES = [
  { value: 'artiste', label: 'Artiste' },
  { value: 'technicien', label: 'Technicien' },
]

export const CACHET_TYPES = [
  { value: 'CI',  label: 'CI — cachet de représentation' },
  { value: 'C2R', label: 'C2R — cachet de deuxième représentation' },
  { value: 'CRI', label: 'CRI — cachet de répétition' },
]

export const SERVICE_TYPES = [
  { value: 'SR3', label: 'SR3' },
  { value: 'SR4', label: 'SR4' },
  { value: 'SR8', label: 'SR8' },
]

export const BASES = [
  { value: 'net', label: 'Net' },
  { value: 'brut', label: 'Brut' },
  { value: 'cout_total', label: 'Coût total employeur' },
]

export const DEJA = [
  { value: 'oui', label: 'Oui, il a déjà été employé' },
  { value: 'non', label: 'Non, ou je ne sais pas' },
]

export const STATUTS = [
  { value: 'nouvelle', label: 'Nouvelle' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'traitee', label: 'Traitée' },
]

export const DEPARTEMENTS = [
  ...Array.from({ length: 95 }, (_, i) => String(i + 1).padStart(2, '0')).filter(c => c !== '20'),
  '2A', '2B', '971', '972', '973', '974', '975', '976',
].sort()
