// Seul fichier à réécrire pour changer de prestataire d'envoi.
// Pour un SMTP maison : remplacer le corps par un client denomailer.

type Message = { to: string[]; sujet: string; texte: string; html: string }

const CLE = Deno.env.get('RESEND_API_KEY')!
const EXPEDITEUR = Deno.env.get('MAIL_FROM')!

export async function envoyer(m: Message): Promise<void> {
  if (!m.to.length) throw new Error('Aucun destinataire')

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${CLE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: EXPEDITEUR,
      to: m.to,
      subject: m.sujet,
      text: m.texte,
      html: m.html,
    }),
  })

  if (!r.ok) throw new Error(`Envoi refusé (${r.status}) : ${await r.text()}`)
}
