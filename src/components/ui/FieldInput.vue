<script setup>
import { ref, computed, useId } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  type: { type: String, default: 'text' },
  error: String,
  showError: Boolean,
  aide: String,
  facultatif: Boolean,
  step: String,
  min: String,
  inputmode: String,
})
const modele = defineModel({ type: [String, Number], default: '' })

const id = useId()
const quitte = ref(false)
const visible = computed(() => !!props.error && (quitte.value || props.showError))
const decrit = computed(() => [
  props.aide ? `${id}-a` : null,
  visible.value ? `${id}-e` : null,
].filter(Boolean).join(' ') || undefined)
</script>

<template>
  <div class="champ" :class="{ invalide: visible }">
    <label :for="id">
      {{ label }}
      <span v-if="facultatif" class="fac">facultatif</span>
    </label>
    <p v-if="aide" :id="`${id}-a`" class="aide">{{ aide }}</p>
    <input
      :id="id"
      v-model="modele"
      :type="type"
      :step="step"
      :min="min"
      :inputmode="inputmode"
      :aria-invalid="visible"
      :aria-describedby="decrit"
      @blur="quitte = true"
    />
    <p v-if="visible" :id="`${id}-e`" class="err">{{ error }}</p>
  </div>
</template>
