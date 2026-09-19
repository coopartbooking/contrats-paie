// Gabarit d'e-mail par défaut de Supabase : le retour de connexion arrive soit en
// fragment (#access_token=…), qui écraserait la route du router en mode hash, soit
// en ?code=… sur la racine, qui afficherait le formulaire de dépôt.
// Ce module normalise l'URL AVANT que le client Supabase et le router ne la lisent.
// Il doit donc rester le tout premier import de main.js.

const CIBLE = '#/gestion/connexion'

export const retourAuth = { access_token: null, refresh_token: null, type: null, erreur: null }

const fragment = new URLSearchParams(location.hash.replace(/^#\/?/, ''))
const requete = new URLSearchParams(location.search)

if (fragment.has('access_token') || fragment.has('error_description') || fragment.has('error')) {
  retourAuth.access_token = fragment.get('access_token')
  retourAuth.refresh_token = fragment.get('refresh_token')
  retourAuth.type = fragment.get('type')
  retourAuth.erreur = fragment.get('error_description') || fragment.get('error')
  history.replaceState(null, '', location.pathname + location.search + CIBLE)
} else if (requete.has('code') && !location.hash.startsWith('#/')) {
  // Flux PKCE : le code reste dans la requête, le client Supabase l'échangera.
  history.replaceState(null, '', location.pathname + location.search + CIBLE)
}
