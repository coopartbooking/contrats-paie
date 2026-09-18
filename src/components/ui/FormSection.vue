<script setup>
defineProps({ titre: String, numero: [String, Number], aide: String })
</script>

<template>
  <section class="section">
    <h4>
      <span v-if="numero" class="num">{{ numero }}</span>
      {{ titre }}
    </h4>
    <p v-if="aide" class="aide-section">{{ aide }}</p>
    <div class="champs"><slot /></div>
    <slot name="apres" />
  </section>
</template>
