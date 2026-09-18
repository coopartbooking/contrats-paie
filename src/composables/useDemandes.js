import { ref, reactive } from 'vue'
import { supabase } from '../lib/supabase'

const CHAMPS_LISTE = `
  id, reference, compagnie, contact_nom, contact_email, statut, revision,
  created_at, traitee_at, paie_purgee_at, contracts(count)
`

export function useDemandes() {
  const demandes = ref([])
  const chargement = ref(false)
  const erreur = ref('')
  const filtre = reactive({ statut: '', q: '' })

  function appliquerFiltres(r) {
    if (filtre.statut) r = r.eq('statut', filtre.statut)
    if (filtre.q.trim()) {
      const q = filtre.q.trim().replace(/[%,]/g, '')
      r = r.or(`compagnie.ilike.%${q}%,reference.ilike.%${q}%,contact_nom.ilike.%${q}%`)
    }
    return r
  }

  async function charger() {
    chargement.value = true
    erreur.value = ''
    const { data, error } = await appliquerFiltres(
      supabase.from('submissions').select(CHAMPS_LISTE).order('created_at', { ascending: false }),
    )
    chargement.value = false
    if (error) { erreur.value = error.message; return }
    demandes.value = (data ?? []).map(d => ({ ...d, nb_salaries: d.contracts?.[0]?.count ?? 0 }))
  }

  async function lignesExport() {
    const { data, error } = await appliquerFiltres(
      supabase.from('submissions')
        .select('reference, statut, compagnie, contact_nom, contact_email, contact_tel, created_at, contracts(*)')
        .order('created_at', { ascending: false }),
    )
    if (error) throw new Error(error.message)
    return (data ?? []).flatMap(d =>
      [...(d.contracts ?? [])]
        .sort((a, b) => a.position - b.position)
        .map(c => ({ ...d, contracts: undefined, ...c })),
    )
  }

  return { demandes, chargement, erreur, filtre, charger, lignesExport }
}

export function useDemande() {
  const demande = ref(null)
  const contrats = ref([])
  const chargement = ref(false)
  const erreur = ref('')

  async function charger(id) {
    chargement.value = true
    erreur.value = ''
    const { data, error } = await supabase
      .from('submissions').select('*, contracts(*)').eq('id', id).single()
    chargement.value = false
    if (error) { erreur.value = error.message; return }
    contrats.value = [...(data.contracts ?? [])].sort((a, b) => a.position - b.position)
    demande.value = { ...data, contracts: undefined }
  }

  async function changerStatut(statut) {
    const { error } = await supabase
      .from('submissions').update({ statut }).eq('id', demande.value.id)
    if (error) { erreur.value = error.message; return }
    demande.value.statut = statut
  }

  async function lireDetailsPaie(contractId) {
    const { data, error } = await supabase.rpc('lire_details_paie', { p_contract: contractId })
    if (error) throw new Error(error.message)
    return data
  }

  return { demande, contrats, chargement, erreur, charger, changerStatut, lireDetailsPaie }
}
