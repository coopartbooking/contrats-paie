const rempli = v => v != null && String(v).trim() !== ''
const nombre = v => rempli(v) && !Number.isNaN(Number(v)) && Number(v) > 0
const entier = v => nombre(v) && Number.isInteger(Number(v))

const OBLIGATOIRE = 'Champ obligatoire'
const POSITIF = 'Indiquez un nombre supérieur à 0'
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// Clé de contrôle du NIR : clé = 97 − (corps mod 97). Corse : 2A → 19, 2B → 18.
export function erreurNir(v) {
  const n = String(v).toUpperCase().replace(/[\s.]/g, '')
  if (!/^[1278]\d{4}(\d{2}|2[AB])\d{8}$/.test(n)) {
    return 'Format attendu : 15 caractères'
  }
  const corps = Number(n.slice(0, 13).replace('2A', '19').replace('2B', '18'))
  if (Number(n.slice(13)) !== 97 - (corps % 97)) {
    return 'Clé de contrôle incorrecte, vérifiez la saisie'
  }
  return null
}

// Contrôle IBAN ISO 13616 (modulo 97).
export function erreurIban(v) {
  const s = String(v).toUpperCase().replace(/[\s-]/g, '')
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return "Format d'IBAN inattendu"
  const r = s.slice(4) + s.slice(0, 4)
  let reste = 0
  for (const ch of r) {
    const val = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55)
    reste = Number(String(reste) + val) % 97
  }
  return reste === 1 ? null : 'Clé de contrôle incorrecte, vérifiez la saisie'
}

export function validerDepot(d) {
  const e = {}
  if (!rempli(d.compagnie)) e.compagnie = OBLIGATOIRE
  if (!rempli(d.contact_nom)) e.contact_nom = OBLIGATOIRE
  if (!rempli(d.contact_email)) e.contact_email = OBLIGATOIRE
  else if (!EMAIL.test(d.contact_email)) e.contact_email = 'Adresse e-mail invalide'
  return e
}

export function validerContrat(c) {
  const e = {}
  const p = c.paie

  if (!rempli(c.nom)) e.nom = OBLIGATOIRE
  if (!rempli(c.prenom)) e.prenom = OBLIGATOIRE

  if (!rempli(c.deja_salarie)) e.deja_salarie = 'Répondez oui ou non'

  if (c.deja_salarie === 'non') {
    // Un NIR ou un IBAN déjà enregistré n'est jamais renvoyé en clair :
    // laisser le champ vide signifie « inchangé ».
    if (!rempli(p.telephone)) e.paie_telephone = OBLIGATOIRE
    if (!rempli(p.email)) e.paie_email = OBLIGATOIRE
    else if (!EMAIL.test(p.email)) e.paie_email = 'Adresse e-mail invalide'
    if (!rempli(p.adresse1)) e.paie_adresse1 = OBLIGATOIRE
    if (p.pays === 'France' && !/^\d{5}$/.test(String(p.code_postal || '').trim())) {
      e.paie_code_postal = 'Code postal à 5 chiffres'
    } else if (!rempli(p.code_postal)) {
      e.paie_code_postal = OBLIGATOIRE
    }
    if (!rempli(p.ville)) e.paie_ville = OBLIGATOIRE
    if (!rempli(p.pays)) e.paie_pays = OBLIGATOIRE
    if (!rempli(p.naissance_date)) e.paie_naissance_date = OBLIGATOIRE
    else if (p.naissance_date >= new Date().toISOString().slice(0, 10)) {
      e.paie_naissance_date = 'Date incohérente'
    }
    if (!rempli(p.naissance_ville)) e.paie_naissance_ville = OBLIGATOIRE
    if (!rempli(p.naissance_pays)) e.paie_naissance_pays = OBLIGATOIRE

    if (rempli(p.nir)) {
      const m = erreurNir(p.nir)
      if (m) e.paie_nir = m
    } else if (!p.nir_masque) {
      e.paie_nir = OBLIGATOIRE
    }

    if (rempli(p.iban)) {
      const m = erreurIban(p.iban)
      if (m) e.paie_iban = m
    } else if (!p.iban_masque) {
      e.paie_iban = OBLIGATOIRE
    }
  }

  if (!rempli(c.date_debut)) e.date_debut = OBLIGATOIRE
  if (!rempli(c.date_fin)) e.date_fin = OBLIGATOIRE
  if (rempli(c.date_debut) && rempli(c.date_fin) && c.date_fin < c.date_debut) {
    e.date_fin = 'La fin ne peut pas précéder le début'
  }

  if (!rempli(c.categorie)) e.categorie = 'Précisez artiste ou technicien'
  if (!rempli(c.profession)) e.profession = OBLIGATOIRE
  if (!rempli(c.spectacle)) e.spectacle = OBLIGATOIRE

  if (c.categorie === 'artiste') {
    if (!entier(c.cachets_nb)) e.cachets_nb = 'Indiquez un nombre entier de cachets'
    if (!rempli(c.cachets_type)) e.cachets_type = OBLIGATOIRE
    if (!nombre(c.cachets_montant)) e.cachets_montant = POSITIF
    if (!rempli(c.cachets_base)) e.cachets_base = 'Précisez net, brut ou coût total'

    if (c.avec_services) {
      if (!entier(c.services_nb)) e.services_nb = 'Indiquez un nombre entier de services'
      if (!rempli(c.services_type)) e.services_type = OBLIGATOIRE
      if (!nombre(c.services_montant)) e.services_montant = POSITIF
      if (!rempli(c.services_base)) e.services_base = 'Précisez net, brut ou coût total'
    }
  }

  if (c.categorie === 'technicien') {
    if (!nombre(c.heures_nb)) e.heures_nb = POSITIF
    if (!nombre(c.heures_montant)) e.heures_montant = POSITIF
    if (!rempli(c.heures_base)) e.heures_base = 'Précisez net, brut ou coût total'
  }

  if (!rempli(c.commune)) e.commune = OBLIGATOIRE
  if (!rempli(c.departement)) e.departement = OBLIGATOIRE

  return e
}

export const aucuneErreur = e => Object.keys(e).length === 0
