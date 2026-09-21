<script setup>
import { onMounted, watch, ref, computed } from 'vue'
import { useDemandes } from '../composables/useDemandes'
import { useAuth } from '../composables/useAuth'
import { versCsv, telecharger } from '../lib/csv'
import { jour, joursAvant } from '../lib/format'
import StatusBadge from '../components/ui/StatusBadge.vue'

// Seuils d'affichage, en jours avant la première prise de poste du dépôt.
const SEUIL_CRITIQUE = 3
const SEUIL_ALERTE = 7

const { demandes, chargement, erreur, filtre, charger, lignesExport } = useDemandes()
const { email, deconnexion } = useAuth()

const tri = ref('urgence')

onMounted(charger)
watch(() => filtre.statut, charger)

let minuteur
watch(() => filtre.q, () => {
  clearTimeout(minuteur)
  minuteur = setTimeout(charger, 250)
})

function urgence(d) {
  if (d.statut === 'traitee' || d.debut == null) return ''
  const j = joursAvant(d.debut)
  if (j <= SEUIL_CRITIQUE) return 'critique'
  if (j <= SEUIL_ALERTE) return 'alerte'
  return ''
}

function delai(d) {
  const j = joursAvant(d.debut)
  if (j == null) return ''
  if (j < -1) return `commencé il y a ${-j} j`
  if (j === -1) return 'commencé hier'
  if (j === 0) return "aujourd'hui"
  if (j === 1) return 'demain'
  return `dans ${j} j`
}

// Non traitées d'abord, par date de début croissante ; traitées en fin de liste.
const triees = computed(() => {
  const liste = [...demandes.value]
  if (tri.value === 'recentes') return liste
  return liste.sort((a, b) => {
    const ta = a.statut === 'traitee'
    const tb = b.statut === 'traitee'
    if (ta !== tb) return ta ? 1 : -1
    return (a.debut ?? '9999-12-31').localeCompare(b.debut ?? '9999-12-31')
  })
})

const nbCritiques = computed(() => demandes.value.filter(d => urgence(d) === 'critique').length)

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
        <router-link to="/gestion/equipe" class="lien">Équipe</router-link> ·
        {{ email }} · <button class="lien" @click="deconnexion">déconnexion</button>
      </span>
    </header>

    <p v-if="nbCritiques" class="bandeau urgent" role="status">
      {{ nbCritiques }}
      {{ nbCritiques > 1 ? 'demandes non traitées démarrent' : 'demande non traitée démarre' }}
      dans les {{ SEUIL_CRITIQUE }} jours, ou ont déjà commencé.
    </p>

    <div class="filtres">
      <input v-model="filtre.q" type="text" placeholder="Référence, compagnie, contact…"
        aria-label="Rechercher" />
      <select v-model="filtre.statut" aria-label="Filtrer par statut">
        <option value="">Tous les statuts</option>
        <option value="nouvelle">Nouvelles</option>
        <option value="en_cours">En cours</option>
        <option value="traitee">Traitées</option>
      </select>
      <select v-model="tri" aria-label="Trier">
        <option value="urgence">Début le plus proche</option>
        <option value="recentes">Plus récentes</option>
      </select>
      <button class="ajouter court" @click="exporter" :disabled="!demandes.length">Export CSV</button>
    </div>

    <p v-if="erreur" class="err bandeau" role="alert">{{ erreur }}</p>
    <p v-if="chargement">Chargement…</p>

    <p v-else-if="!demandes.length" class="attente">
      {{ filtre.q || filtre.statut
        ? 'Aucune demande ne correspond à ces critères.'
        : 'Aucune demande pour le moment.' }}
    </p>

    <div v-else class="tableau">
      <table>
        <thead>
          <tr>
            <th>Référence</th><th>Compagnie</th><th>Salariés</th>
            <th>Début</th><th>Déposée</th><th>Statut</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in triees" :key="d.id" :class="urgence(d) && `ligne-${urgence(d)}`">
            <td>
              <router-link :to="{ name: 'demande', params: { id: d.id } }" class="ref">
                {{ d.reference }}
              </router-link>
              <span v-if="d.revision > 0" class="revision">rév. {{ d.revision }}</span>
            </td>
            <td>{{ d.compagnie }}<br /><span class="sous">{{ d.contact_nom }}</span></td>
            <td class="chiffre">{{ d.nb_salaries }}</td>
            <td>
              <span class="chiffre">{{ jour(d.debut) }}</span>
              <br v-if="d.statut !== 'traitee' && d.debut" />
              <span v-if="d.statut !== 'traitee' && d.debut" class="delai" :class="urgence(d)">
                {{ delai(d) }}
              </span>
            </td>
            <td class="chiffre">{{ jour(d.created_at) }}</td>
            <td><StatusBadge :statut="d.statut" /></td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>
