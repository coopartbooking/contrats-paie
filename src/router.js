import { createRouter, createWebHashHistory } from 'vue-router'
import { supabase } from './lib/supabase'

// Mode hash : le jeton de relecture reste dans le fragment, donc hors des logs
// serveur et de l'en-tête Referer. Aucune règle de rewrite à l'hébergement.
const routes = [
  { path: '/', name: 'depot', component: () => import('./views/DepotView.vue') },
  { path: '/envoye', name: 'depot-envoye', component: () => import('./views/DepotEnvoye.vue') },
  { path: '/relecture', name: 'relecture', component: () => import('./views/RelectureView.vue') },
  { path: '/gestion/connexion', name: 'connexion', component: () => import('./views/ConnexionView.vue') },
  {
    path: '/gestion', name: 'demandes', meta: { gestion: true },
    component: () => import('./views/DemandesView.vue'),
  },
  {
    path: '/gestion/:id', name: 'demande', meta: { gestion: true },
    component: () => import('./views/DemandeView.vue'),
  },
  { path: '/:autre(.*)', component: () => import('./views/IntrouvableView.vue') },
]

export const router = createRouter({ history: createWebHashHistory(), routes })

// Cette garde ne protège rien : c'est RLS qui protège. Elle évite seulement
// d'afficher une page de gestion vide à un visiteur non connecté.
router.beforeEach(async to => {
  if (!to.meta.gestion) return true
  const { data } = await supabase.auth.getSession()
  return data.session ? true : { name: 'connexion', query: { suite: to.fullPath } }
})
