import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export function useGestionnaires() {
  const equipe = ref([])
  const chargement = ref(false)
  const occupe = ref(false)
  const erreur = ref('')
  const identifiants = ref(null)   // { email, mot_de_passe } affiché une seule fois

  async function charger() {
    chargement.value = true
    erreur.value = ''
    const { data, error } = await supabase
      .from('managers').select('user_id, email, admin, created_at').order('created_at')
    chargement.value = false
    if (error) { erreur.value = error.message; return }
    equipe.value = data ?? []
  }

  async function appeler(corps) {
    occupe.value = true
    erreur.value = ''
    const { data, error } = await supabase.functions.invoke('gestionnaires', { body: corps })
    occupe.value = false

    if (error) {
      let message = error.message
      try {
        const detail = await error.context?.json?.()
        if (detail?.erreur) message = detail.erreur
      } catch { /* message générique */ }
      throw new Error(message)
    }
    if (data?.erreur) throw new Error(data.erreur)
    return data
  }

  async function ajouter(email, admin = false) {
    const r = await appeler({ action: 'ajouter', email, admin })
    identifiants.value = r.mot_de_passe ? { email: r.email, mot_de_passe: r.mot_de_passe } : null
    await charger()
    return r
  }

  async function retirer(user_id) {
    await appeler({ action: 'retirer', user_id })
    await charger()
  }

  async function modifier(user_id, admin) {
    await appeler({ action: 'modifier', user_id, admin })
    await charger()
  }

  async function reinitialiser(user_id, email) {
    const r = await appeler({ action: 'reinitialiser', user_id })
    identifiants.value = { email, mot_de_passe: r.mot_de_passe }
    return r
  }

  return {
    equipe, chargement, occupe, erreur, identifiants,
    charger, ajouter, retirer, modifier, reinitialiser,
  }
}
