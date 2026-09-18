// Aucune colonne d'employee_details ici : les éléments du dossier paie
// se consultent une par une, et leur consultation est journalisée.
const COLONNES = [
  ['reference', 'Référence'], ['statut', 'Statut'], ['created_at', 'Déposé le'],
  ['compagnie', 'Compagnie'], ['contact_nom', 'Contact'], ['contact_email', 'E-mail contact'],
  ['contact_tel', 'Téléphone contact'],
  ['nom', 'Nom'], ['prenom', 'Prénom'], ['pseudo', 'Pseudonyme'],
  ['date_debut', 'Début'], ['date_fin', 'Fin'],
  ['categorie', 'Catégorie'], ['profession', 'Profession'], ['spectacle', 'Spectacle'],
  ['cachets_nb', 'Nb cachets'], ['cachets_type', 'Type cachet'],
  ['cachets_montant', 'Montant cachet'], ['cachets_base', 'Base cachet'],
  ['services_nb', 'Nb services'], ['services_type', 'Type service'],
  ['services_montant', 'Montant service'], ['services_base', 'Base service'],
  ['heures_nb', 'Nb heures'], ['heures_montant', 'Montant horaire'], ['heures_base', 'Base horaire'],
  ['commune', 'Commune'], ['departement', 'Département'],
  ['dossier_paie_requis', 'Dossier paie à créer'],
]

const cellule = v => {
  if (v == null) return ''
  if (typeof v === 'boolean') return v ? 'oui' : 'non'
  if (typeof v === 'number') return String(v).replace('.', ',')
  return '"' + String(v).replace(/"/g, '""') + '"'
}

export function versCsv(lignes) {
  const entete = COLONNES.map(([, l]) => cellule(l)).join(';')
  const corps = lignes.map(l => COLONNES.map(([k]) => cellule(l[k])).join(';'))
  return [entete, ...corps].join('\r\n')
}

export function telecharger(nom, csv) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nom
  a.click()
  URL.revokeObjectURL(url)
}
