<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { retourAuth } from '../lib/pre-auth'

const router = useRouter()
const route = useRoute()
const {
  session, gestionnaire, pret, email,
  validerLien, ouvrirSession, deconnexion,
  connexionMotDePasse, demanderReinitialisation, definirMotDePasse,
} = useAuth()

// 'connexion' | 'oubli' | 'nouveau'
const mode = ref('connexion')

const adresse = ref('')
const motDePasse = ref('')
const nouveau = ref('')
const confirmation = ref('')

const occupe = ref(false)
const validation = ref(false)
const erreur = ref('')
const info = ref('')

const suite = () => (route.query.suite ? { suite: String(route.query.suite) } : {})

const mdpValide = computed(() =>
  nouveau.value.length >= 10 && nouveau.value === confirmation.value)

onMounted(async () => {
  if (retourAuth.erreur) {
    erreur.value = 'Ce lien a expiré ou a déjà servi. Demandez-en un nouveau.'
    retourAuth.erreur = null
    return
  }

  const jeton = route.query.token_hash
  if (!retourAuth.access_token && !jeton) return

  const recuperation =
    retourAuth.type === 'recovery' || route.query.type === 'recovery'

  validation.value = true
  try {
    if (retourAuth.access_token) {
      await ouvrirSession(retourAuth)
      retourAuth.access_token = null
      retourAuth.refresh_token = null
      retourAuth.type = null
    } else {
      await validerLien(String(jeton), String(route.query.type || 'magiclink'))
    }
    if (recuperation) mode.value = 'nouveau'
  } catch (e) {
    erreur.value = 'Ce lien a expiré ou a déjà servi. Demandez-en un nouveau.'
  } finally {
    validation.value = false
    router.replace({ name: 'connexion', query: suite() })
  }
})

watch([session, gestionnaire], () => {
  if (mode.value === 'nouveau') return
  if (session.value && gestionnaire.value) {
    router.replace(String(route.query.suite || '/gestion'))
  }
})

async function agir(action) {
  erreur.value = ''
  info.value = ''
  occupe.value = true
  try {
    await action()
  } catch (e) {
    erreur.value = e.message
  } finally {
    occupe.value = false
  }
}

const seConnecter = () => agir(() => connexionMotDePasse(adresse.value, motDePasse.value))

const envoyerReinitialisation = () => agir(async () => {
  await demanderReinitialisation(adresse.value)
  info.value = 'Si cette adresse est autorisée, un lien de réinitialisation vient de partir.'
})

const enregistrerMotDePasse = () => agir(async () => {
  await definirMotDePasse(nouveau.value)
  mode.value = 'connexion'
  info.value = 'Mot de passe enregistré.'
  router.replace(String(route.query.suite || '/gestion'))
})
</script>

<template>
  <main class="page etroite">
    <h1>Gestion des demandes</h1>

    <p v-if="validation">Vérification du lien…</p>
    <p v-else-if="!pret">Vérification de la session…</p>

    <template v-else-if="mode === 'nouveau'">
      <p>Choisissez un mot de passe. Dix caractères au minimum.</p>
      <form @submit.prevent="enregistrerMotDePasse" novalidate>
        <div class="champs">
          <div class="champ">
            <label for="nouveau">Nouveau mot de passe</label>
            <input id="nouveau" v-model="nouveau" type="password" autocomplete="new-password" />
          </div>
          <div class="champ">
            <label for="confirmation">Confirmation</label>
            <input id="confirmation" v-model="confirmation" type="password" autocomplete="new-password" />
          </div>
        </div>
        <p v-if="confirmation && nouveau !== confirmation" class="err">
          Les deux saisies diffèrent.
        </p>
        <button type="submit" class="envoyer" :disabled="occupe || !mdpValide">
          {{ occupe ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </form>
    </template>

    <template v-else-if="mode === 'oubli' && !session">
      <p>Indiquez votre adresse : vous recevrez un lien pour définir un nouveau mot de passe.</p>
      <form @submit.prevent="envoyerReinitialisation" novalidate>
        <div class="champs">
          <div class="champ">
            <label for="adresse-oubli">Adresse e-mail</label>
            <input id="adresse-oubli" v-model="adresse" type="email" autocomplete="email" />
          </div>
        </div>
        <button type="submit" class="envoyer" :disabled="occupe || !adresse">
          {{ occupe ? 'Envoi…' : 'Envoyer le lien' }}
        </button>
      </form>
      <p class="mention">
        <button type="button" class="lien" @click="mode = 'connexion'">Revenir à la connexion</button>
      </p>
    </template>

    <template v-else-if="!session">
      <p>Réservé aux gestionnaires.</p>
      <form @submit.prevent="seConnecter" novalidate>
        <div class="champs">
          <div class="champ">
            <label for="adresse">Adresse e-mail</label>
            <input id="adresse" v-model="adresse" type="email" autocomplete="email" />
          </div>
          <div class="champ">
            <label for="mdp">Mot de passe</label>
            <input id="mdp" v-model="motDePasse" type="password" autocomplete="current-password" />
          </div>
        </div>
        <button type="submit" class="envoyer" :disabled="occupe || !adresse || !motDePasse">
          {{ occupe ? 'Connexion…' : 'Se connecter' }}
        </button>
      </form>
      <p class="mention">
        <button type="button" class="lien" @click="mode = 'oubli'">Mot de passe oublié ?</button>
      </p>
    </template>

    <template v-else-if="gestionnaire === false">
      <p class="err bandeau" role="alert">
        Le compte <strong>{{ email }}</strong> n'est pas autorisé à consulter les demandes.
        Demandez à un gestionnaire de l'ajouter.
      </p>
      <button class="ajouter" @click="deconnexion">Se déconnecter</button>
    </template>

    <p v-else>Connexion…</p>

    <p v-if="info" class="bandeau ok" role="status">{{ info }}</p>
    <p v-if="erreur" class="err bandeau" role="alert">{{ erreur }}</p>
  </main>
</template>
