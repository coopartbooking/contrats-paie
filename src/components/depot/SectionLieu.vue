<script setup>
import FormSection from '../ui/FormSection.vue'
import FieldInput from '../ui/FieldInput.vue'
import FieldSelect from '../ui/FieldSelect.vue'
import { DEPARTEMENTS } from '../../lib/constants'

const c = defineModel({ type: Object, required: true })
defineProps({ erreurs: { type: Object, default: () => ({}) }, showError: Boolean })
</script>

<template>
  <FormSection titre="Le lieu de travail" numero="5">
    <FieldInput v-model="c.commune" label="Commune"
      :error="erreurs.commune" :show-error="showError" />
    <FieldSelect v-model="c.departement" label="Département" :options="DEPARTEMENTS"
      placeholder="Code du département"
      :error="erreurs.departement" :show-error="showError" />
  </FormSection>
</template>
