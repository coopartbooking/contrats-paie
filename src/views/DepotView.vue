<script setup>
import { nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDepot } from '../composables/useDepot'
import FormulaireDepot from '../components/depot/FormulaireDepot.vue'

const router = useRouter()
const { depot, etat, manquants, envoyer, reinitialiser, mode } = useDepot()

onMounted(() => { if (mode.value !== 'creation') reinitialiser() })

async function soumettre() {
  const ok = await envoyer()
  if (ok) return router.push({ name: 'depot-envoye' })
  await nextTick()
  document.querySelector('.champ.invalide')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
</script>

<template>
  <div class="barre">
    <div class="barre-inner">
      <span class="marque">Demande de contrat</span>
      <span class="etat" :class="{ prete: manquants === 0 }">
        <span class="pastille"></span>
        {{ depot.contracts.length }} salarié{{ depot.contracts.length > 1 ? 's' : '' }} ·
        {{ manquants === 0
          ? 'prêt à envoyer'
          : manquants + ' champ' + (manquants > 1 ? 's' : '') + ' à compléter' }}
      </span>
    </div>
  </div>

  <main class="page">
    <header class="intro">
      <h1>Demande de contrat de travail</h1>
      <p>
        Ces informations servent directement à la rédaction des contrats par le service paie.
        Un lien de modification vous sera envoyé par e-mail après l'envoi : vous pourrez corriger
        la demande tant qu'elle n'a pas été prise en charge.
      </p>
    </header>

    <form @submit.prevent="soumettre" novalidate>
      <FormulaireDepot />

      <p v-if="etat.tente && manquants > 0" class="err bandeau" role="alert">
        Des informations manquent encore : {{ manquants }} champ{{ manquants > 1 ? 's sont signalés' : ' est signalé' }} ci-dessus.
      </p>
      <p v-if="etat.erreur" class="err bandeau" role="alert">{{ etat.erreur }}</p>

      <button type="submit" class="envoyer" :disabled="etat.envoi">
        {{ etat.envoi ? 'Envoi…' : 'Envoyer la demande' }}
      </button>
    </form>
  </main>
</template>
