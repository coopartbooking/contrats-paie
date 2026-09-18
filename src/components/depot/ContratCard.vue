<script setup>
import { ref, computed } from 'vue'
import SectionSalarie from './SectionSalarie.vue'
import SectionContrat from './SectionContrat.vue'
import SectionEmploi from './SectionEmploi.vue'
import SectionRemunArtiste from './SectionRemunArtiste.vue'
import SectionRemunTechnicien from './SectionRemunTechnicien.vue'
import SectionLieu from './SectionLieu.vue'
import { aucuneErreur } from '../../lib/validation'

const c = defineModel({ type: Object, required: true })
const props = defineProps({
  index: { type: Number, required: true },
  erreurs: { type: Object, default: () => ({}) },
  showError: Boolean,
  supprimable: Boolean,
})
defineEmits(['supprimer'])

const ouvert = ref(true)
const complet = computed(() => aucuneErreur(props.erreurs))
const titre = computed(() => {
  const n = [c.value.prenom, c.value.nom].filter(Boolean).join(' ')
  return n || `Salarié ${props.index + 1}`
})
</script>

<template>
  <article class="bloc carte" :class="{ ferme: !ouvert }">
    <header>
      <button type="button" class="titre-carte" :aria-expanded="ouvert" @click="ouvert = !ouvert">
        <span class="chevron">{{ ouvert ? '▼' : '▶' }}</span>
        <span class="ordre">{{ index + 1 }}</span>
        {{ titre }}
      </button>
      <span v-if="showError" class="badge" :class="complet ? 'ok' : 'incomplet'">
        {{ complet ? 'complet' : 'incomplet' }}
      </span>
      <button v-if="supprimable" type="button" class="retirer" @click="$emit('supprimer')">
        Retirer
      </button>
    </header>

    <div class="corps" v-show="ouvert">
      <SectionSalarie v-model="c" :erreurs="erreurs" :show-error="showError" />
      <SectionContrat v-model="c" :erreurs="erreurs" :show-error="showError" />
      <SectionEmploi v-model="c" :erreurs="erreurs" :show-error="showError" />

      <SectionRemunArtiste v-if="c.categorie === 'artiste'" v-model="c"
        :erreurs="erreurs" :show-error="showError" />
      <SectionRemunTechnicien v-else-if="c.categorie === 'technicien'" v-model="c"
        :erreurs="erreurs" :show-error="showError" />
      <p v-else class="attente">
        Choisissez <em>artiste</em> ou <em>technicien</em> ci-dessus pour afficher les champs
        de rémunération.
      </p>

      <SectionLieu v-model="c" :erreurs="erreurs" :show-error="showError" />
    </div>
  </article>
</template>
