<script setup>
import { onMounted, ref } from 'vue'
import { useGestionnaires } from '../composables/useGestionnaires'
import { useAuth } from '../composables/useAuth'
import { jour } from '../lib/format'

const {
  equipe, chargement, occupe, erreur, identifiants,
  charger, ajouter, retirer, modifier, reinitialiser,
} = useGestionnaires()
const { email: monEmail, administrateur } = useAuth()

const nouvelleAdresse = ref('')
const nouvelAdmin = ref(false)
const copie = ref(false)

onMounted(charger)

async function tenter(action) {
  erreur.value = ''
  try { await action() } catch (e) { erreur.value = e.message }
}

const ajouterGestionnaire = () => tenter(async () => {
  await ajouter(nouvelleAdresse.value, nouvelAdmin.value)
  nouvelleAdresse.value = ''
  nouvelAdmin.value = false
})

const retirerGestionnaire = (g) => tenter(async () => {
  if (!confirm(`Retirer l'accès de ${g.email} ?`)) return
  await retirer(g.user_id)
})

const basculerAdmin = (g) => tenter(() => modifier(g.user_id, !g.admin))

const nouveauMotDePasse = (g) => tenter(async () => {
  if (!confirm(`Générer un nouveau mot de passe pour ${g.email} ? L'ancien cessera de fonctionner.`)) return
  await reinitialiser(g.user_id, g.email)
})

async function copier(texte) {
  try {
    await navigator.clipboard.writeText(texte)
    copie.value = true
    setTimeout(() => { copie.value = false }, 2000)
  } catch { /* le presse-papiers peut être refusé */ }
}
</script>

<template>
  <main class="page">
    <router-link to="/gestion" class="lien">← Toutes les demandes</router-link>

    <header class="entete-gestion">
      <h1>Équipe</h1>
    </header>

    <p v-if="!administrateur" class="err bandeau" role="alert">
      Seul un administrateur peut modifier les accès. Vous pouvez consulter la liste.
    </p>

    <p v-if="erreur" class="err bandeau" role="alert">{{ erreur }}</p>

    <section v-if="identifiants" class="recap-carte identifiants">
      <h3>Mot de passe provisoire</h3>
      <p class="mention">
        Il ne sera plus affiché. Transmettez-le à {{ identifiants.email }} par un canal
        distinct de l'e-mail, et demandez-lui de le changer à la première connexion.
      </p>
      <p class="reference">{{ identifiants.mot_de_passe }}</p>
      <div class="barre-actions">
        <button class="ajouter court" @click="copier(identifiants.mot_de_passe)">
          {{ copie ? 'Copié' : 'Copier' }}
        </button>
        <button class="lien" @click="identifiants = null">J'ai noté, masquer</button>
      </div>
    </section>

    <section v-if="administrateur" class="recap-carte">
      <h3>Ajouter un gestionnaire</h3>
      <form @submit.prevent="ajouterGestionnaire" novalidate>
        <div class="champs">
          <div class="champ">
            <label for="adresse">Adresse e-mail</label>
            <input id="adresse" v-model="nouvelleAdresse" type="email" autocomplete="off" />
          </div>
          <label class="bascule">
            <input type="checkbox" v-model="nouvelAdmin" />
            <span>Administrateur — pourra gérer les accès à son tour</span>
          </label>
        </div>
        <button type="submit" class="envoyer" :disabled="occupe || !nouvelleAdresse">
          {{ occupe ? 'En cours…' : 'Ajouter' }}
        </button>
      </form>
    </section>

    <p v-if="chargement">Chargement…</p>

    <div v-else class="tableau">
      <table>
        <thead>
          <tr>
            <th>Adresse</th><th>Rôle</th><th>Depuis</th><th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="g in equipe" :key="g.user_id">
            <td>
              {{ g.email }}
              <span v-if="g.email === monEmail" class="sous">(vous)</span>
            </td>
            <td>
              <span class="badge" :class="g.admin ? 'ok' : ''">
                {{ g.admin ? 'administrateur' : 'gestionnaire' }}
              </span>
            </td>
            <td class="chiffre">{{ jour(g.created_at) }}</td>
            <td class="actions">
              <template v-if="administrateur">
                <button class="lien" :disabled="occupe" @click="basculerAdmin(g)">
                  {{ g.admin ? 'Retirer le rôle admin' : 'Nommer administrateur' }}
                </button>
                <button class="lien" :disabled="occupe" @click="nouveauMotDePasse(g)">
                  Nouveau mot de passe
                </button>
                <button
                  v-if="g.email !== monEmail"
                  class="lien danger" :disabled="occupe" @click="retirerGestionnaire(g)">
                  Retirer l'accès
                </button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="mention">
      Retirer l'accès supprime les droits sans effacer le compte ni le journal des
      consultations. La personne peut toujours se connecter, mais ne voit plus aucune demande.
    </p>
  </main>
</template>
