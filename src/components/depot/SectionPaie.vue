<script setup>
import FieldInput from '../ui/FieldInput.vue'

const p = defineModel({ type: Object, required: true })
defineProps({ erreurs: { type: Object, default: () => ({}) }, showError: Boolean })

const aideMasquee = (masque, defaut) =>
  masque ? `Déjà enregistré (${masque}). Laissez vide pour ne pas le modifier.` : defaut
</script>

<template>
  <div class="sous-bloc">
    <h5 class="titre-sous">Éléments pour la création du dossier</h5>
    <p class="aide-section">
      Le service paie ne dispose pas encore de ce salarié. Ces informations ne servent qu'à
      établir le contrat et la paie ; le numéro de sécurité sociale et l'IBAN ne sont jamais
      réaffichés en clair.
    </p>
    <div class="champs">
      <FieldInput v-model="p.telephone" label="Téléphone" type="tel"
        :error="erreurs.paie_telephone" :show-error="showError" />
      <FieldInput v-model="p.email" label="Adresse e-mail du salarié" type="email"
        :error="erreurs.paie_email" :show-error="showError" />
      <FieldInput v-model="p.adresse1" label="Adresse"
        :error="erreurs.paie_adresse1" :show-error="showError" />
      <FieldInput v-model="p.adresse2" label="Complément d'adresse" facultatif />
      <FieldInput v-model="p.code_postal" label="Code postal" inputmode="numeric"
        :error="erreurs.paie_code_postal" :show-error="showError" />
      <FieldInput v-model="p.ville" label="Commune"
        :error="erreurs.paie_ville" :show-error="showError" />
      <FieldInput v-model="p.pays" label="Pays"
        :error="erreurs.paie_pays" :show-error="showError" />
      <FieldInput v-model="p.naissance_date" label="Date de naissance" type="date"
        :error="erreurs.paie_naissance_date" :show-error="showError" />
      <FieldInput v-model="p.naissance_ville" label="Commune de naissance"
        :error="erreurs.paie_naissance_ville" :show-error="showError" />
      <FieldInput v-model="p.naissance_pays" label="Pays de naissance"
        :error="erreurs.paie_naissance_pays" :show-error="showError" />
      <FieldInput v-model="p.conges_spectacles" label="N° Congés Spectacles" facultatif
        aide="S'il en a déjà un ; sinon laissez vide." />
      <FieldInput v-model="p.nir" label="N° de sécurité sociale"
        :aide="aideMasquee(p.nir_masque, '15 caractères. La clé de contrôle est vérifiée en direct.')"
        :error="erreurs.paie_nir" :show-error="showError" />
      <FieldInput v-model="p.iban" label="IBAN"
        :aide="aideMasquee(p.iban_masque, 'La clé de contrôle est vérifiée en direct.')"
        :error="erreurs.paie_iban" :show-error="showError" />
    </div>
  </div>
</template>
