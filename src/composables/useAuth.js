import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

const session = ref(null)
const gestionnaire = ref(null)   // null = pas encore vérifié
const pret = ref(false)
let amorce = false

async function appliquer(s) {
  session.value = s
  if (!s) {
    gestionnaire.value = null
  } else {
    const { data } = await supabase
      .from('managers').select('user_id').eq('user_id', s.user.id).maybeSingle()
    gestionnaire.value = !!data
  }
  pret.value = true
}

// Une adresse inconnue ne doit pas être distinguable d'une adresse autorisée.
const SILENCIEUX = /signups? not allowed|user not found|invalid login/i

export function useAuth() {
  if (!amorce) {
    amorce = true
    supabase.auth.getSession().then(({ data }) => appliquer(data.session))
    supabase.auth.onAuthStateChange((_, s) => appliquer(s))
  }

  // shouldCreateUser: false — aucun compte n'est créé à la demande. Les gestionnaires
  // sont ajoutés depuis le dashboard Supabase, puis dans la table `managers`.
  async function demanderLien(adresse) {
    const { error } = await supabase.auth.signInWithOtp({
      email: String(adresse).trim(),
      options: {
        shouldCreateUser: false,
        // Sans fragment : le gabarit par défaut y place lui-même le jeton,
        // et pre-auth.js remet la route en place au chargement.
        emailRedirectTo: `${location.origin}${location.pathname}`,
      },
    })
    if (error && !SILENCIEUX.test(error.message)) throw new Error(error.message)
  }

  // Le gabarit d'e-mail renvoie token_hash dans le fragment : pas de jeton d'accès
  // dans l'URL, pas de collision avec le router, et le lien fonctionne depuis
  // n'importe quel navigateur.
  async function validerLien(token_hash, type = 'magiclink') {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (error) throw new Error(error.message)
  }

  // Retour du gabarit par défaut : les jetons arrivent déjà émis.
  async function ouvrirSession({ access_token, refresh_token }) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token })
    if (error) throw new Error(error.message)
  }

  return {
    session, gestionnaire, pret, ouvrirSession,
    email: computed(() => session.value?.user?.email ?? ''),
    demanderLien, validerLien,
    deconnexion: () => supabase.auth.signOut(),
  }
}
