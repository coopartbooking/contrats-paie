<script setup>
import { computed, useId } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  options: { type: Array, required: true },
  error: String,
  showError: Boolean,
})
const modele = defineModel({ type: String, default: '' })

const id = useId()
const visible = computed(() => !!props.error && props.showError)
</script>

<template>
  <fieldset class="champ radio" :class="{ invalide: visible }">
    <legend>{{ label }}</legend>
    <div class="options">
      <label v-for="o in options" :key="o.value" class="option">
        <input type="radio" :name="id" :value="o.value" v-model="modele" />
        <span>{{ o.label }}</span>
      </label>
    </div>
    <p v-if="visible" class="err">{{ error }}</p>
  </fieldset>
</template>
