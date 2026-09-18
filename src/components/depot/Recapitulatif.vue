<script setup>
import { montant, jour, libelle, ou, masque } from '../../lib/format'
import { CATEGORIES, CACHET_TYPES, SERVICE_TYPES, BASES } from '../../lib/constants'
import { aucuneErreur } from '../../lib/validation'

defineProps({
  depot: { type: Object, required: true },
  erreursContrats: { type: Array, default: () => [] },
  showError: Boolean,
})

const nomAffiche = (c, i) =>
  [c.prenom, c.nom].filter(Boolean).join(' ') || `Salarié ${i + 1}`
</script>

<template>
  <section class="recap">
    <h3>Récapitulatif</h3>
    <p class="aide-section">
      Relisez avant d'envoyer : c'est sur cette base que le contrat sera rédigé.
    </p>

    <div class="recap-carte">
      <dl>
        <div><dt>Compagnie</dt><dd>{{ ou(depot.compagnie) }}</dd></div>
        <div><dt>Contact</dt><dd>{{ ou(depot.contact_nom) }} · {{ ou(depot.contact_email) }}</dd></div>
      </dl>
    </div>

    <div class="recap-carte" v-for="(c, i) in depot.contracts" :key="c._cle">
      <h4>
        {{ nomAffiche(c, i) }}
        <span class="sous" v-if="c.pseudo">«&nbsp;{{ c.pseudo }}&nbsp;»</span>
        <span v-if="showError && !aucuneErreur(erreursContrats[i] || {})" class="badge incomplet">
          incomplet
        </span>
      </h4>
      <dl>
        <div>
          <dt>Emploi</dt>
          <dd>{{ ou(c.profession) }} <span class="sous">({{ libelle(CATEGORIES, c.categorie) }})</span></dd>
        </div>
        <div><dt>Spectacle</dt><dd>{{ ou(c.spectacle) }}</dd></div>
        <div><dt>Période</dt><dd class="chiffre">{{ jour(c.date_debut) }} → {{ jour(c.date_fin) }}</dd></div>

        <template v-if="c.categorie === 'artiste'">
          <div>
            <dt>Cachets</dt>
            <dd>
              <span class="chiffre">{{ ou(c.cachets_nb) }} × {{ montant(c.cachets_montant) }}</span>
              <span class="sous"> — {{ libelle(CACHET_TYPES, c.cachets_type) }}, {{ libelle(BASES, c.cachets_base) }}</span>
            </dd>
          </div>
          <div v-if="c.avec_services">
            <dt>Services de répétition</dt>
            <dd>
              <span class="chiffre">{{ ou(c.services_nb) }} × {{ montant(c.services_montant) }}</span>
              <span class="sous"> — {{ libelle(SERVICE_TYPES, c.services_type) }}, {{ libelle(BASES, c.services_base) }}</span>
            </dd>
          </div>
        </template>

        <div v-else-if="c.categorie === 'technicien'">
          <dt>Heures</dt>
          <dd>
            <span class="chiffre">{{ ou(c.heures_nb) }} h × {{ montant(c.heures_montant) }}</span>
            <span class="sous"> — {{ libelle(BASES, c.heures_base) }}</span>
          </dd>
        </div>

        <div><dt>Lieu</dt><dd>{{ ou(c.commune) }} <span class="sous">({{ ou(c.departement) }})</span></dd></div>

        <div>
          <dt>Dossier paie</dt>
          <dd v-if="c.deja_salarie === 'oui'" class="sous">déjà salarié, rien à fournir</dd>
          <dd v-else-if="c.deja_salarie === 'non'">
            {{ ou(c.paie.adresse1) }}, {{ ou(c.paie.code_postal) }} {{ ou(c.paie.ville) }}<br />
            <span class="sous">né(e) le </span>
            <span class="chiffre">{{ jour(c.paie.naissance_date) }}</span>
            <span class="sous"> à </span>{{ ou(c.paie.naissance_ville) }}<br />
            <span class="sous">sécu </span>
            <span class="chiffre">{{ c.paie.nir ? masque(c.paie.nir) : (c.paie.nir_masque || '—') }}</span>
            <span class="sous"> · IBAN </span>
            <span class="chiffre">{{ c.paie.iban ? masque(c.paie.iban) : (c.paie.iban_masque || '—') }}</span>
          </dd>
          <dd v-else class="sous">—</dd>
        </div>
      </dl>
    </div>
  </section>
</template>
