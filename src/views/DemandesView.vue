<script setup>
import { onMounted, watch } from 'vue'
import { useDemandes } from '../composables/useDemandes'
import { useAuth } from '../composables/useAuth'
import { versCsv, telecharger } from '../lib/csv'
import { jour } from '../lib/format'
import StatusBadge from '../components/ui/StatusBadge.vue'

const { demandes, chargement, erreur, filtre, charger, lignesExport } = useDemandes()
const { email, deconnexion } = useAuth()

onMounted(charger)
watch(() => filtre.statut, charger)

let minuteur
watch(() => filtre.q, () => {
  clearTimeout(minuteur)
  minuteur = setTimeout(charger, 250)
})

async function exporter() {
  try {
    const lignes = await lignesExport()
    telecharger(`demandes-contrats-${new Date().toISOString().slice(0, 10)}.csv`, versCsv(lignes))
  } catch (e) {
    erreur.value = e.message
  }
}
</script>

<template>
  <main class="page large">
    <header class="entete-gestion">
      <h1>Demandes reçues</h1>
      <span class="compte">
        {{ email }} · <button class="lien" @click="deconnexion">déconnexion</button>
      </span>
    </header>

    <div class="filtres">
      <input v-model="filtre.q" type="text" placeholder="Référence, compagnie, contact…"
        aria-label="Rechercher" />
      <select v-model="filtre.statut" aria-label="Filtrer par statut">
        <option value="">Tous les statuts</option>
        <option value="nouvelle">Nouvelles</option>
        <option value="en_cours">En cours</option>
        <option value="traitee">Traitées</option>
      </select>
      <button class="ajouter court" @click="exporter" :disabled="!demandes.length">Export CSV</button>
    </div>

    <p v-if="erreur" class="err bandeau" role="alert">{{ erreur }}</p>
    <p v-if="chargement">Chargement…</p>

    <p v-else-if="!demandes.length" class="attente">
      Aucune demande ne correspond{{ filtre.q || filtre.statut ? ' à ces critères' : '' }}.
    </p>

    <div v-else class="tableau">
      <table>
        <thead>
          <tr>
            <th>Référence</th><th>Compagnie</th><th>Salariés</th><th>Déposée</th><th>Statut</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in demandes" :key="d.id">
            <td>
              <router-link :to="{ name: 'demande', params: { id: d.id } }" class="ref">
                {{ d.reference }}
              </router-link>
              <span v-if="d.revision > 0" class="revision">rév. {{ d.revision }}</span>
            </td>
            <td>{{ d.compagnie }}<br /><span class="sous">{{ d.contact_nom }}</span></td>
            <td class="chiffre">{{ d.nb_salaries }}</td>
            <td class="chiffre">{{ jour(d.created_at) }}</td>
            <td><StatusBadge :statut="d.statut" /></td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>
