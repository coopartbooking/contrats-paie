export const paieVide = () => ({
  telephone: '', email: '',
  adresse1: '', adresse2: '', code_postal: '', ville: '', pays: 'France',
  naissance_date: '', naissance_ville: '', naissance_pays: 'France',
  conges_spectacles: '', nir: '', iban: '',
  nir_masque: '', iban_masque: '',
})

let compteur = 0

export const contratVide = () => ({
  _cle: 'c' + (++compteur),
  id: null,
  nom: '', prenom: '', pseudo: '',
  date_debut: '', date_fin: '',
  categorie: '', profession: '', spectacle: '',
  cachets_nb: '', cachets_type: '', cachets_montant: '', cachets_base: '',
  avec_services: false,
  services_nb: '', services_type: '', services_montant: '', services_base: '',
  heures_nb: '', heures_montant: '', heures_base: '',
  commune: '', departement: '',
  deja_salarie: '', paie: paieVide(),
})

export const depotVide = () => ({
  compagnie: '', contact_nom: '', contact_email: '', contact_tel: '',
  contracts: [contratVide()],
})
