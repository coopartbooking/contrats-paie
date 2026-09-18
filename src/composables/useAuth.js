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

export function useAuth() {
  if (!amorce) {
    amorce = true
    supabase.auth.getSession().then(({ data }) => appliquer(data.session))
    supabase.auth.onAuthStateChange((_, s) => appliquer(s))
  }

  return {
    session, gestionnaire, pret,
    email: computed(() => session.value?.user?.email ?? ''),
    connexionGoogle: () => supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: location.origin + location.pathname },
    }),
    deconnexion: () => supabase.auth.signOut(),
  }
}
