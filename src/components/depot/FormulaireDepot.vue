<script setup>
import { nextTick } from 'vue'
import { useDepot } from '../../composables/useDepot'
import BlocCompagnie from './BlocCompagnie.vue'
import ContratCard from './ContratCard.vue'
import Recapitulatif from './Recapitulatif.vue'

const {
  depot, etat, erreursDepot, erreursContrats, ajouterSalarie, retirerSalarie,
} = useDepot()

async function ajouter() {
  ajouterSalarie()
  await nextTick()
  const cartes = document.querySelectorAll('.carte')
  cartes[cartes.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <BlocCompagnie v-model="depot" :erreurs="erreursDepot" :show-error="etat.tente" />

  <ContratCard
    v-for="(c, i) in depot.contracts"
    :key="c._cle"
    v-model="depot.contracts[i]"
    :index="i"
    :erreurs="erreursContrats[i]"
    :show-error="etat.tente"
    :supprimable="depot.contracts.length > 1"
    @supprimer="retirerSalarie(i)"
  />

  <button type="button" class="ajouter" @click="ajouter">+ Ajouter un salarié</button>

  <Recapitulatif :depot="depot" :erreurs-contrats="erreursContrats" :show-error="etat.tente" />
</template>
