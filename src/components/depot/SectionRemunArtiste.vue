<script setup>
import FormSection from '../ui/FormSection.vue'
import FieldInput from '../ui/FieldInput.vue'
import FieldSelect from '../ui/FieldSelect.vue'
import FieldRadio from '../ui/FieldRadio.vue'
import { CACHET_TYPES, SERVICE_TYPES, BASES } from '../../lib/constants'

const c = defineModel({ type: Object, required: true })
defineProps({ erreurs: { type: Object, default: () => ({}) }, showError: Boolean })
</script>

<template>
  <FormSection titre="La rémunération" numero="4">
    <FieldInput v-model="c.cachets_nb" label="Nombre de cachets" type="number" min="1" step="1"
      inputmode="numeric" :error="erreurs.cachets_nb" :show-error="showError" />
    <FieldSelect v-model="c.cachets_type" label="Type de cachet" :options="CACHET_TYPES"
      :error="erreurs.cachets_type" :show-error="showError" />
    <FieldInput v-model="c.cachets_montant" label="Montant par cachet (€)" type="number" min="0"
      step="0.01" inputmode="decimal" :error="erreurs.cachets_montant" :show-error="showError" />
    <FieldRadio v-model="c.cachets_base" label="Ce montant est exprimé en" :options="BASES"
      :error="erreurs.cachets_base" :show-error="showError" />

    <template #apres>
      <label class="bascule">
        <input type="checkbox" v-model="c.avec_services" />
        <span>Ce contrat comprend aussi des services de répétition</span>
      </label>

      <div class="sous-bloc" v-if="c.avec_services">
        <div class="champs">
          <FieldInput v-model="c.services_nb" label="Nombre de services de répétition" type="number"
            min="1" step="1" inputmode="numeric"
            :error="erreurs.services_nb" :show-error="showError" />
          <FieldSelect v-model="c.services_type" label="Type de service" :options="SERVICE_TYPES"
            :error="erreurs.services_type" :show-error="showError" />
          <FieldInput v-model="c.services_montant" label="Montant par service (€)" type="number"
            min="0" step="0.01" inputmode="decimal"
            :error="erreurs.services_montant" :show-error="showError" />
          <FieldRadio v-model="c.services_base" label="Ce montant est exprimé en" :options="BASES"
            :error="erreurs.services_base" :show-error="showError" />
        </div>
      </div>
    </template>
  </FormSection>
</template>
