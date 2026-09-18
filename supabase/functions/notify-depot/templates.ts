type Salarie = { nom: string; prenom: string; spectacle: string; position: number }

export type Depot = {
  reference: string
  compagnie: string
  contact_nom: string
  contact_email: string
  revision: number
  edit_token: string
  edit_expires_at: string
  contracts: Salarie[]
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const jour = (iso: string) => new Date(iso).toLocaleDateString('fr-FR')

const page = (titre: string, corps: string) => `
<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.55;color:#141c18;max-width:34rem">
  <h2 style="font-size:1.1rem;margin:0 0 .8rem">${esc(titre)}</h2>
  ${corps}
</div>`

const liste = (s: Salarie[]) =>
  [...s].sort((a, b) => a.position - b.position).map(c => `${c.prenom} ${c.nom} — ${c.spectacle}`)

export function nouveauGestionnaires(d: Depot, lien: string) {
  const noms = liste(d.contracts)
  return {
    sujet: `Nouvelle demande de contrat — ${d.compagnie} (${d.reference})`,
    texte: [
      `${d.compagnie} a déposé une demande de contrat.`,
      '',
      `Référence : ${d.reference}`,
      `Contact : ${d.contact_nom} (${d.contact_email})`,
      `Salarié${noms.length > 1 ? 's' : ''} : ${noms.length}`,
      ...noms.map(n => `  · ${n}`),
      '',
      `Ouvrir la demande : ${lien}`,
    ].join('\n'),
    html: page(`Nouvelle demande — ${d.reference}`, `
      <p><strong>${esc(d.compagnie)}</strong> a déposé une demande de contrat.</p>
      <p>Contact : ${esc(d.contact_nom)} — ${esc(d.contact_email)}</p>
      <ul>${noms.map(n => `<li>${esc(n)}</li>`).join('')}</ul>
      <p><a href="${esc(lien)}">Ouvrir la demande</a></p>`),
  }
}

export function revisionGestionnaires(d: Depot, lien: string) {
  const noms = liste(d.contracts)
  return {
    sujet: `Demande modifiée — ${d.compagnie} (${d.reference})`,
    texte: [
      `${d.compagnie} a modifié sa demande ${d.reference} (révision ${d.revision}).`,
      '',
      `Salarié${noms.length > 1 ? 's' : ''} après modification : ${noms.length}`,
      ...noms.map(n => `  · ${n}`),
      '',
      `Ouvrir la demande : ${lien}`,
    ].join('\n'),
    html: page(`Demande modifiée — ${d.reference}`, `
      <p><strong>${esc(d.compagnie)}</strong> a modifié sa demande (révision ${d.revision}).</p>
      <ul>${noms.map(n => `<li>${esc(n)}</li>`).join('')}</ul>
      <p><a href="${esc(lien)}">Ouvrir la demande</a></p>`),
  }
}

export function confirmationCompagnie(d: Depot, lienRelecture: string) {
  const n = d.contracts.length
  return {
    sujet: `Votre demande de contrat ${d.reference}`,
    texte: [
      `Bonjour ${d.contact_nom},`,
      '',
      `Votre demande de contrat a bien été reçue : ${n} salarié${n > 1 ? 's' : ''}.`,
      `Référence : ${d.reference}`,
      '',
      "Vous pouvez relire et corriger cette demande tant qu'elle n'a pas été prise en charge :",
      lienRelecture,
      `Ce lien reste valable jusqu'au ${jour(d.edit_expires_at)}.`,
      '',
      "Conservez-le : il n'est pas renvoyé automatiquement.",
    ].join('\n'),
    html: page('Demande reçue', `
      <p>Bonjour ${esc(d.contact_nom)},</p>
      <p>Votre demande de contrat a bien été reçue&nbsp;: ${n} salarié${n > 1 ? 's' : ''}.<br>
         Référence&nbsp;: <strong>${esc(d.reference)}</strong></p>
      <p>Vous pouvez relire et corriger cette demande tant qu'elle n'a pas été prise en charge&nbsp;:<br>
         <a href="${esc(lienRelecture)}">${esc(lienRelecture)}</a></p>
      <p style="color:#5c6b62">Ce lien reste valable jusqu'au ${jour(d.edit_expires_at)}.
         Conservez-le, il n'est pas renvoyé automatiquement.</p>`),
  }
}

export function avisPurge(d: Depot) {
  return {
    sujet: `Données supprimées — demande ${d.reference}`,
    texte: [
      `Bonjour ${d.contact_nom},`,
      '',
      `Concernant votre demande ${d.reference} :`,
      '',
      "les éléments d'identité et les coordonnées bancaires que vous avez transmis pour la",
      'création des dossiers salariés ont été supprimés de notre base, comme prévu une fois',
      'les contrats établis.',
      '',
      'Les informations nécessaires aux contrats — salarié, dates, emploi, rémunération, lieu —',
      'sont conservées.',
      '',
      "Aucune action de votre part n'est nécessaire.",
    ].join('\n'),
    html: page('Données supprimées', `
      <p>Bonjour ${esc(d.contact_nom)},</p>
      <p>Concernant votre demande <strong>${esc(d.reference)}</strong> : les éléments d'identité
         et les coordonnées bancaires transmis pour la création des dossiers salariés ont été
         supprimés de notre base, comme prévu une fois les contrats établis.</p>
      <p>Les informations nécessaires aux contrats — salarié, dates, emploi, rémunération, lieu —
         sont conservées.</p>
      <p style="color:#5c6b62">Aucune action de votre part n'est nécessaire.</p>`),
  }
}
