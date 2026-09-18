import { reactive, ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { contratVide, depotVide, paieVide } from '../lib/factories'
import { validerDepot, validerContrat, aucuneErreur } from '../lib/validation'

const nb = v => (v === '' || v == null ? null : Number(v))
const txt = v => (v === '' || v == null ? null : String(v).trim())

function versPayload(d) {
  return {
    compagnie: txt(d.compagnie),
    contact_nom: txt(d.contact_nom),
    contact_email: txt(d.contact_email),
    contact_tel: txt(d.contact_tel),
    contracts: d.contracts.map(c => {
      const artiste = c.categorie === 'artiste'
      const services = artiste && c.avec_services
      const requis = c.deja_salarie === 'non'
      return {
        id: c.id || null,
        nom: txt(c.nom), prenom: txt(c.prenom), pseudo: txt(c.pseudo),
        date_debut: c.date_debut || null, date_fin: c.date_fin || null,
        categorie: c.categorie || null,
        profession: txt(c.profession), spectacle: txt(c.spectacle),
        cachets_nb: artiste ? nb(c.cachets_nb) : null,
        cachets_type: artiste ? (c.cachets_type || null) : null,
        cachets_montant: artiste ? nb(c.cachets_montant) : null,
        cachets_base: artiste ? (c.cachets_base || null) : null,
        services_nb: services ? nb(c.services_nb) : null,
        services_type: services ? (c.services_type || null) : null,
        services_montant: services ? nb(c.services_montant) : null,
        services_base: services ? (c.services_base || null) : null,
        heures_nb: artiste ? null : nb(c.heures_nb),
        heures_montant: artiste ? null : nb(c.heures_montant),
        heures_base: artiste ? null : (c.heures_base || null),
        commune: txt(c.commune), departement: c.departement || null,
        dossier_paie_requis: requis,
        details: requis ? {
          telephone: txt(c.paie.telephone),
          email: txt(c.paie.email),
          adresse1: txt(c.paie.adresse1),
          adresse2: txt(c.paie.adresse2),
          code_postal: txt(c.paie.code_postal),
          ville: txt(c.paie.ville),
          pays: txt(c.paie.pays),
          naissance_date: c.paie.naissance_date || null,
          naissance_ville: txt(c.paie.naissance_ville),
          naissance_pays: txt(c.paie.naissance_pays),
          conges_spectacles: txt(c.paie.conges_spectacles),
          nir: txt(c.paie.nir) ? txt(c.paie.nir).toUpperCase().replace(/[\s.]/g, '') : null,
          iban: txt(c.paie.iban) ? txt(c.paie.iban).toUpperCase().replace(/[\s-]/g, '') : null,
        } : null,
      }
    }),
  }
}

function depuisServeur(data) {
  const d = depotVide()
  d.compagnie = data.compagnie ?? ''
  d.contact_nom = data.contact_nom ?? ''
  d.contact_email = data.contact_email ?? ''
  d.contact_tel = data.contact_tel ?? ''
  d.contracts = (data.contracts ?? []).map(c => {
    const v = contratVide()
    Object.assign(v, {
      id: c.id,
      nom: c.nom ?? '', prenom: c.prenom ?? '', pseudo: c.pseudo ?? '',
      date_debut: c.date_debut ?? '', date_fin: c.date_fin ?? '',
      categorie: c.categorie ?? '', profession: c.profession ?? '', spectacle: c.spectacle ?? '',
      cachets_nb: c.cachets_nb ?? '', cachets_type: c.cachets_type ?? '',
      cachets_montant: c.cachets_montant ?? '', cachets_base: c.cachets_base ?? '',
      avec_services: c.services_nb != null,
      services_nb: c.services_nb ?? '', services_type: c.services_type ?? '',
      services_montant: c.services_montant ?? '', services_base: c.services_base ?? '',
      heures_nb: c.heures_nb ?? '', heures_montant: c.heures_montant ?? '',
      heures_base: c.heures_base ?? '',
      commune: c.commune ?? '', departement: c.departement ?? '',
      deja_salarie: c.dossier_paie_requis ? 'non' : 'oui',
    })
    if (c.details) {
      Object.assign(v.paie, paieVide(), {
        telephone: c.details.telephone ?? '',
        email: c.details.email ?? '',
        adresse1: c.details.adresse1 ?? '',
        adresse2: c.details.adresse2 ?? '',
        code_postal: c.details.code_postal ?? '',
        ville: c.details.ville ?? '',
        pays: c.details.pays ?? 'France',
        naissance_date: c.details.naissance_date ?? '',
        naissance_ville: c.details.naissance_ville ?? '',
        naissance_pays: c.details.naissance_pays ?? 'France',
        conges_spectacles: c.details.conges_spectacles ?? '',
        nir: '', iban: '',
        nir_masque: c.details.nir_masque ?? '',
        iban_masque: c.details.iban_masque ?? '',
      })
    }
    return v
  })
  return d
}

const depot = reactive(depotVide())
const mode = ref('creation')          // 'creation' | 'relecture'
const jeton = ref('')
const etat = reactive({
  chargement: false, envoi: false, tente: false,
  erreur: '', resultat: null,
  editable: true, statut: 'nouvelle', reference: '', revision: 0,
  expire_le: null, paie_purgee_at: null,
})

export function useDepot() {
  const erreursDepot = computed(() => validerDepot(depot))
  const erreursContrats = computed(() => depot.contracts.map(validerContrat))
  const manquants = computed(() =>
    Object.keys(erreursDepot.value).length +
    erreursContrats.value.reduce((n, e) => n + Object.keys(e).length, 0))
  const valide = computed(() => manquants.value === 0)
  const complet = i => aucuneErreur(erreursContrats.value[i] || {})

  function reinitialiser() {
    Object.assign(depot, depotVide())
    mode.value = 'creation'
    jeton.value = ''
    Object.assign(etat, {
      chargement: false, envoi: false, tente: false, erreur: '', resultat: null,
      editable: true, statut: 'nouvelle', reference: '', revision: 0,
      expire_le: null, paie_purgee_at: null,
    })
  }

  async function chargerDepuisJeton(token) {
    etat.chargement = true
    etat.erreur = ''
    const { data, error } = await supabase.rpc('get_depot', { p_token: token })
    etat.chargement = false
    if (error) { etat.erreur = error.message; return false }

    mode.value = 'relecture'
    jeton.value = token
    Object.assign(depot, depuisServeur(data))
    Object.assign(etat, {
      editable: data.editable,
      statut: data.statut,
      reference: data.reference,
      revision: data.revision,
      expire_le: data.expires_at,
      paie_purgee_at: data.paie_purgee_at,
      tente: false,
    })
    return true
  }

  function ajouterSalarie() {
    const dernier = depot.contracts[depot.contracts.length - 1]
    const c = contratVide()
    if (dernier) {
      c.spectacle = dernier.spectacle
      c.date_debut = dernier.date_debut
      c.date_fin = dernier.date_fin
      c.commune = dernier.commune
      c.departement = dernier.departement
    }
    depot.contracts.push(c)
    return c
  }

  function retirerSalarie(i) {
    if (depot.contracts.length > 1) depot.contracts.splice(i, 1)
  }

  async function envoyer() {
    etat.tente = true
    etat.erreur = ''
    if (!valide.value) return false

    etat.envoi = true
    const payload = versPayload(depot)
    const { data, error } = mode.value === 'relecture'
      ? await supabase.rpc('update_depot', { p_token: jeton.value, payload })
      : await supabase.rpc('submit_depot', { payload })
    etat.envoi = false

    if (error) { etat.erreur = error.message; return false }
    etat.resultat = data
    return true
  }

  return {
    depot, mode, etat,
    erreursDepot, erreursContrats, manquants, valide, complet,
    ajouterSalarie, retirerSalarie, envoyer, reinitialiser, chargerDepuisJeton,
    apercuPayload: computed(() => JSON.stringify(versPayload(depot), null, 2)),
  }
}
