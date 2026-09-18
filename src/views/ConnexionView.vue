<script setup>
import { watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const route = useRoute()
const { session, gestionnaire, pret, email, connexionGoogle, deconnexion } = useAuth()

watch([session, gestionnaire], () => {
  if (session.value && gestionnaire.value) {
    router.replace(String(route.query.suite || '/gestion'))
  }
})
</script>

<template>
  <main class="page etroite">
    <h1>Gestion des demandes</h1>

    <p v-if="!pret">Vérification de la session…</p>

    <template v-else-if="!session">
      <p>Réservé aux gestionnaires.</p>
      <button class="envoyer" @click="connexionGoogle">Se connecter avec Google</button>
    </template>

    <template v-else-if="gestionnaire === false">
      <p class="err bandeau" role="alert">
        Le compte <strong>{{ email }}</strong> n'est pas autorisé à consulter les demandes.
        Demandez à un gestionnaire de l'ajouter.
      </p>
      <button class="ajouter" @click="deconnexion">Se déconnecter</button>
    </template>

    <p v-else>Connexion…</p>
  </main>
</template>
