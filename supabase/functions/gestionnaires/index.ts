import { createClient } from 'npm:@supabase/supabase-js@2'

const URL = Deno.env.get('SUPABASE_URL')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

// Mot de passe provisoire lisible : pas de caractères ambigus.
function motDePasseProvisoire(longueur = 14) {
  const lettres = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const octets = new Uint8Array(longueur)
  crypto.getRandomValues(octets)
  return Array.from(octets, o => lettres[o % lettres.length]).join('')
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erreur: 'Méthode non autorisée' }, 405)

  const entete = req.headers.get('Authorization')
  if (!entete) return json({ erreur: 'Non autorisé' }, 401)

  const client = createClient(URL, ANON, {
    global: { headers: { Authorization: entete } },
    auth: { persistSession: false },
  })

  const { data: { user } } = await client.auth.getUser()
  if (!user) return json({ erreur: 'Non autorisé' }, 401)

  const { data: appelant } = await admin
    .from('managers').select('user_id, admin').eq('user_id', user.id).maybeSingle()

  if (!appelant?.admin) {
    return json({ erreur: 'Réservé aux administrateurs' }, 403)
  }

  let action = ''
  let corps: Record<string, unknown> = {}
  try {
    corps = await req.json()
    action = String(corps.action ?? '')
  } catch {
    return json({ erreur: 'Corps illisible' }, 400)
  }

  if (action === 'ajouter') {
    const email = String(corps.email ?? '').trim().toLowerCase()
    const estAdmin = corps.admin === true
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ erreur: 'Adresse e-mail invalide' }, 400)
    }

    const { data: liste } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    let compte = liste?.users.find(u => u.email?.toLowerCase() === email)
    let motDePasse: string | null = null

    if (!compte) {
      motDePasse = motDePasseProvisoire()
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: motDePasse,
        email_confirm: true,
      })
      if (error || !data.user) return json({ erreur: error?.message ?? 'Création impossible' }, 400)
      compte = data.user
    }

    const { error } = await admin.from('managers').upsert({
      user_id: compte.id,
      email,
      admin: estAdmin,
    }, { onConflict: 'user_id' })

    if (error) return json({ erreur: error.message }, 400)

    return json({
      email,
      admin: estAdmin,
      compte_cree: motDePasse !== null,
      mot_de_passe: motDePasse,
    })
  }

  if (action === 'retirer') {
    const user_id = String(corps.user_id ?? '')
    if (user_id === user.id) {
      return json({ erreur: 'Vous ne pouvez pas retirer votre propre accès' }, 400)
    }

    const { data: admins } = await admin.from('managers').select('user_id').eq('admin', true)
    const cible = await admin.from('managers').select('admin').eq('user_id', user_id).maybeSingle()
    if (cible.data?.admin && (admins?.length ?? 0) <= 1) {
      return json({ erreur: 'Il doit rester au moins un administrateur' }, 400)
    }

    const { error } = await admin.from('managers').delete().eq('user_id', user_id)
    if (error) return json({ erreur: error.message }, 400)
    return json({ retire: user_id })
  }

  if (action === 'modifier') {
    const user_id = String(corps.user_id ?? '')
    const estAdmin = corps.admin === true

    if (user_id === user.id && !estAdmin) {
      return json({ erreur: 'Vous ne pouvez pas retirer vos propres droits' }, 400)
    }

    const { error } = await admin.from('managers').update({ admin: estAdmin }).eq('user_id', user_id)
    if (error) return json({ erreur: error.message }, 400)
    return json({ user_id, admin: estAdmin })
  }

  if (action === 'reinitialiser') {
    const user_id = String(corps.user_id ?? '')
    const motDePasse = motDePasseProvisoire()
    const { error } = await admin.auth.admin.updateUserById(user_id, { password: motDePasse })
    if (error) return json({ erreur: error.message }, 400)
    return json({ user_id, mot_de_passe: motDePasse })
  }

  return json({ erreur: 'Action inconnue' }, 400)
})
