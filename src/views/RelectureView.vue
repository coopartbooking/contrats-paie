<script setup>
import { onMounted, nextTick, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useDepot } from '../composables/useDepot'
import FormulaireDepot from '../components/depot/FormulaireDepot.vue'
import Recapitulatif from '../components/depot/Recapitulatif.vue'
import { jour, instant } from '../lib/format'

const route = useRoute()
const { depot, etat, manquants, erreursContrats, envoyer, chargerDepuisJeton } = useDepot()
const enregistre = ref(false)

onMounted(async () => {
  const t = route.query.t
  if (!t) { etat.erreur = 'Lien incomplet.'; return }
  await chargerDepuisJeton(String(t))
})

async function soumettre() {
  enregistre.value = false
  const ok = await envoyer()
  if (ok) {
    enregistre.value = true
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  await nextTick()
  document.querySelector('.champ.invalide')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
</script>

<template>
  <main class="page" v-if="etat.chargement"><p>Chargement de la demande…</p></main>

  <main class="page etroite" v-else-if="etat.erreur && !etat.reference">
    <h1>Lien invalide</h1>
    <p class="err bandeau" role="alert">{{ etat.erreur }}</p>
    <p class="mention">
      Ce lien est peut-être expiré. Contactez le service paie en indiquant le nom de votre compagnie.
    </p>
  </main>

  <template v-else>
    <div class="barre">
      <div class="barre-inner">
        <span class="marque">Demande {{ etat.reference }}</span>
        <span v-if="etat.editable" class="etat" :class="{ prete: manquants === 0 }">
          <span class="pastille"></span>
          {{ manquants === 0
            ? 'aucune erreur'
            : manquants + ' champ' + (manquants > 1 ? 's' : '') + ' à compléter' }}
        </span>
      </div>
    </div>

    <main class="page">
      <header class="intro">
        <h1>Votre demande de contrat</h1>
        <p v-if="etat.editable">
          Vous pouvez corriger cette demande et l'enregistrer à nouveau. Le service paie est
          averti de chaque modification.
        </p>
        <p v-else>
          Cette demande est en lecture seule : elle a été prise en charge par le service paie,
          ou le lien de modification a expiré. Pour un changement, contactez le service paie.
        </p>
      </header>

      <p v-if="enregistre" class="bandeau ok" role="status">
        Modifications enregistrées (révision {{ etat.revision }}).
      </p>

      <p v-if="etat.paie_purgee_at" class="mention effacee">
        Les éléments d'identité et coordonnées bancaires transmis pour les dossiers salariés
        ont été supprimés le {{ jour(etat.paie_purgee_at) }}, les contrats étant établis.
      </p>

      <template v-if="etat.editable">
        <form @submit.prevent="soumettre" novalidate>
          <FormulaireDepot />

          <p v-if="etat.tente && manquants > 0" class="err bandeau" role="alert">
            Des informations manquent : {{ manquants }} champ{{ manquants > 1 ? 's sont signalés' : ' est signalé' }} ci-dessus.
          </p>
          <p v-if="etat.erreur" class="err bandeau" role="alert">{{ etat.erreur }}</p>

          <button type="submit" class="envoyer" :disabled="etat.envoi">
            {{ etat.envoi ? 'Enregistrement…' : 'Enregistrer les modifications' }}
          </button>
        </form>
        <p class="mention" v-if="etat.expire_le">
          Ce lien reste valable jusqu'au {{ jour(etat.expire_le) }}.
        </p>
      </template>

      <Recapitulatif v-else :depot="depot" :erreurs-contrats="erreursContrats" />
    </main>
  </template>
</template>
