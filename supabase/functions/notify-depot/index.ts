import { createClient } from 'npm:@supabase/supabase-js@2'
import { envoyer } from './envoi.ts'
import {
  Depot, nouveauGestionnaires, revisionGestionnaires, confirmationCompagnie, avisPurge,
} from './templates.ts'

const SECRET = Deno.env.get('NOTIFY_SECRET')!
const BASE = Deno.env.get('APP_BASE_URL')!.replace(/\/+$/, '') + '/'

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
)

const CHAMPS = `
  reference, compagnie, contact_nom, contact_email, revision,
  edit_token, edit_expires_at,
  contracts ( nom, prenom, spectacle, position )
`

Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('Méthode non autorisée', { status: 405 })
  if (req.headers.get('authorization') !== `Bearer ${SECRET}`) {
    return new Response('Non autorisé', { status: 401 })
  }

  let submission_id = ''
  let event = ''
  try {
    const corps = await req.json()
    submission_id = String(corps.submission_id ?? '')
    event = String(corps.event ?? '')
  } catch {
    return new Response('Corps illisible', { status: 400 })
  }

  if (!submission_id || !['nouveau', 'revision', 'purge'].includes(event)) {
    return new Response('Paramètres invalides', { status: 400 })
  }

  const { data, error } = await admin
    .from('submissions').select(CHAMPS).eq('id', submission_id).single()

  if (error || !data) return new Response('Dépôt introuvable', { status: 404 })
  const depot = data as unknown as Depot

  // Priorité à la boîte partagée du service paie ; à défaut, les gestionnaires.
  const fixes = (Deno.env.get('NOTIFY_TO') ?? '')
    .split(',').map(a => a.trim()).filter(Boolean)

  let destGestion = fixes
  if (!destGestion.length) {
    const { data: gestionnaires } = await admin.from('managers').select('email')
    const adresses = (gestionnaires ?? []).map(g => g.email).filter(Boolean)
    const secours = Deno.env.get('NOTIFY_FALLBACK')
    destGestion = adresses.length ? adresses : (secours ? [secours] : [])
  }

  const lienGestion = `${BASE}#/gestion/${submission_id}`
  const lienRelecture = `${BASE}#/relecture?t=${depot.edit_token}`

  const envois: { to: string[]; message: ReturnType<typeof avisPurge> }[] = []

  if (event === 'nouveau') {
    if (destGestion.length) {
      envois.push({ to: destGestion, message: nouveauGestionnaires(depot, lienGestion) })
    }
    envois.push({ to: [depot.contact_email], message: confirmationCompagnie(depot, lienRelecture) })
  } else if (event === 'revision' && destGestion.length) {
    envois.push({ to: destGestion, message: revisionGestionnaires(depot, lienGestion) })
  } else if (event === 'purge') {
    envois.push({ to: [depot.contact_email], message: avisPurge(depot) })
  }

  const journal: { statut: 'envoye' | 'echec'; to: string[]; erreur?: string }[] = []

  for (const e of envois) {
    try {
      await envoyer({ to: e.to, ...e.message })
      journal.push({ statut: 'envoye', to: e.to })
    } catch (err) {
      journal.push({ statut: 'echec', to: e.to, erreur: String(err) })
    }
  }

  if (journal.length) {
    await admin.from('notifications').insert(journal.map(j => ({
      submission_id,
      event,
      destinataires: j.to,
      statut: j.statut,
      erreur: j.erreur ?? null,
    })))
  }

  const echecs = journal.filter(j => j.statut === 'echec')
  return new Response(
    JSON.stringify({ event, envoyes: journal.length - echecs.length, echecs: echecs.length }),
    { status: echecs.length ? 500 : 200, headers: { 'Content-Type': 'application/json' } },
  )
})
