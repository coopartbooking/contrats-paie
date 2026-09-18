<script setup>
import FormSection from '../ui/FormSection.vue'
import FieldInput from '../ui/FieldInput.vue'

const depot = defineModel({ type: Object, required: true })
defineProps({ erreurs: { type: Object, default: () => ({}) }, showError: Boolean })
</script>

<template>
  <section class="bloc">
    <header><span class="titre-carte">La compagnie</span></header>
    <div class="corps">
      <FormSection titre="Contact" aide="Pour vous recontacter si un point reste à préciser.">
        <FieldInput v-model="depot.compagnie" label="Nom de la compagnie"
          :error="erreurs.compagnie" :show-error="showError" />
        <FieldInput v-model="depot.contact_nom" label="Personne à contacter"
          :error="erreurs.contact_nom" :show-error="showError" />
        <FieldInput v-model="depot.contact_email" label="Adresse e-mail" type="email"
          aide="Le récapitulatif et le lien de modification y seront envoyés."
          :error="erreurs.contact_email" :show-error="showError" />
        <FieldInput v-model="depot.contact_tel" label="Téléphone" type="tel" facultatif />
      </FormSection>
    </div>
  </section>
</template>
