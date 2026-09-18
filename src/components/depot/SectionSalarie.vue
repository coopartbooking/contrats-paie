<script setup>
import FormSection from '../ui/FormSection.vue'
import FieldInput from '../ui/FieldInput.vue'
import FieldRadio from '../ui/FieldRadio.vue'
import SectionPaie from './SectionPaie.vue'
import { DEJA } from '../../lib/constants'

const c = defineModel({ type: Object, required: true })
defineProps({ erreurs: { type: Object, default: () => ({}) }, showError: Boolean })
</script>

<template>
  <FormSection titre="Le salarié" numero="1">
    <FieldInput v-model="c.nom" label="Nom" :error="erreurs.nom" :show-error="showError" />
    <FieldInput v-model="c.prenom" label="Prénom" :error="erreurs.prenom" :show-error="showError" />
    <FieldInput v-model="c.pseudo" label="Pseudonyme" facultatif
      aide="Nom de scène, s'il doit figurer au contrat." />
    <FieldRadio v-model="c.deja_salarie" label="A-t-il déjà été employé par le service paie ?"
      :options="DEJA" :error="erreurs.deja_salarie" :show-error="showError" />

    <template #apres>
      <SectionPaie v-if="c.deja_salarie === 'non'" v-model="c.paie"
        :erreurs="erreurs" :show-error="showError" />
    </template>
  </FormSection>
</template>
