<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { retourAuth } from '../lib/pre-auth'

const router = useRouter()
const route = useRoute()
const {
  session, gestionnaire, pret, email,
  demanderLien, validerLien, ouvrirSession, deconnexion,
} = useAuth()

const adresse = ref('')
const envoi = ref(false)
const envoye = ref(false)
const validation = ref(false)
const erreur = ref('')

const suite = () => (route.query.suite ? { suite: String(route.query.suite) } : {})

onMounted(async () => {
  if (retourAuth.erreur) {
    erreur.value = 'Ce lien a expiré ou a déjà servi. Demandez-en un nouveau.'
    retourAuth.erreur = null
    return
  }

  const jeton = route.query.token_hash
  if (!retourAuth.access_token && !jeton) return

  validation.value = true
  try {
    if (retourAuth.access_token) {
      await ouvrirSession(retourAuth)
      retourAuth.access_token = null
      retourAuth.refresh_token = null
    } else {
      await validerLien(String(jeton), String(route.query.type || 'magiclink'))
    }
  } catch (e) {
    erreur.value = 'Ce lien a expiré ou a déjà servi. Demandez-en un nouveau.'
  } finally {
    validation.value = false
    router.replace({ name: 'connexion', query: suite() })
  }
})

watch([session, gestionnaire], () => {
  if (session.value && gestionnaire.value) {
    router.replace(String(route.query.suite || '/gestion'))
  }
})

async function soumettre() {
  erreur.value = ''
  envoi.value = true
  try {
    await demanderLien(adresse.value)
    envoye.value = true
  } catch (e) {
    erreur.value = e.message
  } finally {
    envoi.value = false
  }
}
</script>

<template>
  <main class="page etroite">
    <h1>Gestion des demandes</h1>

    <p v-if="validation">Connexion en cours…</p>
    <p v-else-if="!pret">Vérification de la session…</p>

    <template v-else-if="!session">
      <p>Réservé aux gestionnaires. Vous recevrez un lien de connexion par e-mail.</p>

      <form v-if="!envoye" @submit.prevent="soumettre" novalidate>
        <div class="champs">
          <div class="champ">
            <label for="adresse">Adresse e-mail</label>
            <input id="adresse" v-model="adresse" type="email" autocomplete="email" required />
          </div>
        </div>
        <button type="submit" class="envoyer" :disabled="envoi || !adresse">
          {{ envoi ? 'Envoi…' : 'Recevoir un lien de connexion' }}
        </button>
      </form>

      <p v-else class="bandeau ok" role="status">
        Si cette adresse est autorisée, un lien de connexion vient d'être envoyé.
        Il est valable une heure et ne sert qu'une fois.
      </p>

      <p v-if="erreur" class="err bandeau" role="alert">{{ erreur }}</p>
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
