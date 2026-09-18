<script setup>
import { computed, onUnmounted } from 'vue'
import { useDepot } from '../composables/useDepot'
import { jour } from '../lib/format'

const { depot, etat, reinitialiser } = useDepot()

const lien = computed(() =>
  etat.resultat?.edit_token
    ? `${location.origin}${location.pathname}#/relecture?t=${etat.resultat.edit_token}`
    : '')

onUnmounted(reinitialiser)
</script>

<template>
  <main class="page etroite">
    <template v-if="etat.resultat">
      <p class="sceau">✓ Demande envoyée</p>
      <h1>Merci, c'est enregistré.</h1>
      <p>Référence de votre dossier :</p>
      <span class="reference">{{ etat.resultat.reference }}</span>

      <p>
        Un e-mail de confirmation vient de partir vers <strong>{{ depot.contact_email }}</strong>.
        Il contient le lien ci-dessous, qui permet de relire et corriger la demande tant qu'elle
        n'a pas été prise en charge.
      </p>
      <a class="lien-jeton" :href="lien">{{ lien }}</a>
      <p class="mention" v-if="etat.resultat.expires_at">
        Ce lien reste valable jusqu'au {{ jour(etat.resultat.expires_at) }}.
      </p>
    </template>

    <template v-else>
      <h1>Aucune demande en cours</h1>
      <p><router-link to="/">Déposer une demande</router-link></p>
    </template>
  </main>
</template>
