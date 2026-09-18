<script setup>
import FormSection from '../ui/FormSection.vue'
import FieldInput from '../ui/FieldInput.vue'

const c = defineModel({ type: Object, required: true })
defineProps({ erreurs: { type: Object, default: () => ({}) }, showError: Boolean })
</script>

<template>
  <FormSection titre="La durée du contrat" numero="2">
    <FieldInput v-model="c.date_debut" label="Date de début" type="date"
      :error="erreurs.date_debut" :show-error="showError" />
    <FieldInput v-model="c.date_fin" label="Date de fin" type="date"
      :error="erreurs.date_fin" :show-error="showError" />
  </FormSection>
</template>
