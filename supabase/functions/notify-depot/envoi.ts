// Envoi par le serveur SMTP d'OVH, depuis une boîte dédiée qui ne reçoit rien.
// Seul fichier à réécrire pour changer de prestataire.
//
// Port 465 (TLS implicite) : Supabase bloque 25 et 587 en sortie, pas 465.
import nodemailer from 'npm:nodemailer@^9'

type Message = { to: string[]; sujet: string; texte: string; html: string }

const transport = nodemailer.createTransport({
  host: Deno.env.get('SMTP_HOST') ?? 'ssl0.ovh.net',
  port: Number(Deno.env.get('SMTP_PORT') ?? 465),
  secure: true,
  auth: {
    user: Deno.env.get('SMTP_USER')!,
    pass: Deno.env.get('SMTP_PASSWORD')!,
  },
})

// OVH refuse un expéditeur différent du compte authentifié :
// MAIL_FROM doit porter la même adresse que SMTP_USER.
const EXPEDITEUR = Deno.env.get('MAIL_FROM')!

// Les réponses des compagnies reviennent dans la boîte du service paie.
const REPONDRE_A = Deno.env.get('MAIL_REPLY_TO')

export async function envoyer(m: Message): Promise<void> {
  if (!m.to.length) throw new Error('Aucun destinataire')

  await transport.sendMail({
    from: EXPEDITEUR,
    to: m.to.join(', '),
    replyTo: REPONDRE_A || undefined,
    subject: m.sujet,
    text: m.texte,
    html: m.html,
  })
}
