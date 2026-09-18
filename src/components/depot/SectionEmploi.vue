<script setup>
import FormSection from '../ui/FormSection.vue'
import FieldInput from '../ui/FieldInput.vue'
import FieldRadio from '../ui/FieldRadio.vue'
import { CATEGORIES } from '../../lib/constants'

const c = defineModel({ type: Object, required: true })
defineProps({ erreurs: { type: Object, default: () => ({}) }, showError: Boolean })
</script>

<template>
  <FormSection titre="La nature de l'emploi" numero="3">
    <FieldRadio v-model="c.categorie" label="Artiste ou technicien ?" :options="CATEGORIES"
      :error="erreurs.categorie" :show-error="showError" />
    <FieldInput v-model="c.profession" label="Profession"
      aide="Telle qu'elle figurera au contrat : comédienne, danseur, technicienne son…"
      :error="erreurs.profession" :show-error="showError" />
    <FieldInput v-model="c.spectacle" label="Nom du spectacle"
      :error="erreurs.spectacle" :show-error="showError" />
  </FormSection>
</template>
