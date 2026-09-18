<script setup>
import { ref, computed, useId } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  options: { type: Array, required: true },
  placeholder: { type: String, default: 'Choisir…' },
  error: String,
  showError: Boolean,
  aide: String,
})
const modele = defineModel({ type: String, default: '' })

const id = useId()
const quitte = ref(false)
const visible = computed(() => !!props.error && (quitte.value || props.showError))
const normalisees = computed(() =>
  props.options.map(o => (typeof o === 'string' ? { value: o, label: o } : o)))
</script>

<template>
  <div class="champ" :class="{ invalide: visible }">
    <label :for="id">{{ label }}</label>
    <p v-if="aide" class="aide">{{ aide }}</p>
    <select
      :id="id"
      v-model="modele"
      :aria-invalid="visible"
      :aria-describedby="visible ? `${id}-e` : undefined"
      @blur="quitte = true"
    >
      <option value="" disabled>{{ placeholder }}</option>
      <option v-for="o in normalisees" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>
    <p v-if="visible" :id="`${id}-e`" class="err">{{ error }}</p>
  </div>
</template>
