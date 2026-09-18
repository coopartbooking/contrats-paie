<script setup>
import FormSection from '../ui/FormSection.vue'
import FieldInput from '../ui/FieldInput.vue'
import FieldRadio from '../ui/FieldRadio.vue'
import { BASES } from '../../lib/constants'

const c = defineModel({ type: Object, required: true })
defineProps({ erreurs: { type: Object, default: () => ({}) }, showError: Boolean })
</script>

<template>
  <FormSection titre="La rémunération" numero="4">
    <FieldInput v-model="c.heures_nb" label="Nombre d'heures total" type="number" min="0"
      step="0.25" inputmode="decimal" :error="erreurs.heures_nb" :show-error="showError" />
    <FieldInput v-model="c.heures_montant" label="Montant horaire (€)" type="number" min="0"
      step="0.01" inputmode="decimal" :error="erreurs.heures_montant" :show-error="showError" />
    <FieldRadio v-model="c.heures_base" label="Ce montant est exprimé en" :options="BASES"
      :error="erreurs.heures_base" :show-error="showError" />
  </FormSection>
</template>
