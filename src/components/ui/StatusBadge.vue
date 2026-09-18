<script setup>
const LIBELLES = { nouvelle: 'Nouvelle', en_cours: 'En cours', traitee: 'Traitée' }
defineProps({ statut: String })
</script>

<template>
  <span class="statut" :class="statut">{{ LIBELLES[statut] ?? statut }}</span>
</template>
