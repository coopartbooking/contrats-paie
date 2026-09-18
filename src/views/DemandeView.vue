<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useDemande } from '../composables/useDemandes'
import { montant, jour, instant, libelle } from '../lib/format'
import { CATEGORIES, CACHET_TYPES, SERVICE_TYPES, BASES } from '../lib/constants'
import StatusBadge from '../components/ui/StatusBadge.vue'

const route = useRoute()
const {
  demande, contrats, chargement, erreur, charger, changerStatut, lireDetailsPaie,
} = useDemande()

const paie = ref({})
const chargePaie = ref('')
const copie = ref(false)

onMounted(() => charger(route.params.id))

const lienRelecture = computed(() =>
  demande.value
    ? `${location.origin}${location.pathname}#/relecture?t=${demande.value.edit_token}`
    : '')

async function afficherPaie(id) {
  chargePaie.value = id
  try {
    paie.value[id] = await lireDetailsPaie(id)
  } catch (e) {
    erreur.value = e.message
  } finally {
    chargePaie.value = ''
  }
}

async function copierLien() {
  try {
    await navigator.clipboard.writeText(lienRelecture.value)
    copie.value = true
    setTimeout(() => { copie.value = false }, 2000)
  } catch {
    erreur.value = 'Copie refusée par le navigateur : ' + lienRelecture.value
  }
}
</script>

<template>
  <main class="page" v-if="demande">
    <router-link to="/gestion" class="lien">← Toutes les demandes</router-link>

    <header class="entete-demande">
      <h1>{{ demande.reference }}</h1>
      <StatusBadge :statut="demande.statut" />
    </header>

    <p v-if="erreur" class="err bandeau" role="alert">{{ erreur }}</p>

    <div class="barre-actions">
      <label>
        Statut
        <select :value="demande.statut" @change="changerStatut($event.target.value)">
          <option value="nouvelle">Nouvelle</option>
          <option value="en_cours">En cours</option>
          <option value="traitee">Traitée</option>
        </select>
      </label>
      <button class="ajouter court" @click="copierLien">
        {{ copie ? 'Lien copié' : 'Copier le lien de modification' }}
      </button>
    </div>

    <p v-if="demande.statut === 'traitee' && demande.traitee_at" class="mention">
      Traitée le {{ jour(demande.traitee_at) }}. Les éléments du dossier paie seront effacés
      un mois après cette date.
    </p>
    <p v-if="demande.paie_purgee_at" class="mention effacee">
      Éléments du dossier paie effacés le {{ jour(demande.paie_purgee_at) }}.
    </p>

    <section class="recap-carte">
      <h3>Compagnie</h3>
      <dl>
        <div><dt>Nom</dt><dd>{{ demande.compagnie }}</dd></div>
        <div><dt>Contact</dt><dd>{{ demande.contact_nom }}</dd></div>
        <div>
          <dt>E-mail</dt>
          <dd><a :href="'mailto:' + demande.contact_email">{{ demande.contact_email }}</a></dd>
        </div>
        <div v-if="demande.contact_tel"><dt>Téléphone</dt><dd>{{ demande.contact_tel }}</dd></div>
        <div><dt>Déposée</dt><dd class="chiffre">{{ instant(demande.created_at) }}</dd></div>
        <div v-if="demande.revision > 0">
          <dt>Modifiée</dt>
          <dd class="chiffre">{{ demande.revision }} fois, dernière le {{ instant(demande.last_edited_at) }}</dd>
        </div>
      </dl>
    </section>

    <section v-for="c in contrats" :key="c.id" class="recap-carte">
      <h3>
        {{ c.prenom }} {{ c.nom }}
        <span class="sous" v-if="c.pseudo">«&nbsp;{{ c.pseudo }}&nbsp;»</span>
      </h3>
      <dl>
        <div>
          <dt>Emploi</dt>
          <dd>{{ c.profession }} <span class="sous">({{ libelle(CATEGORIES, c.categorie) }})</span></dd>
        </div>
        <div><dt>Spectacle</dt><dd>{{ c.spectacle }}</dd></div>
        <div><dt>Période</dt><dd class="chiffre">{{ jour(c.date_debut) }} → {{ jour(c.date_fin) }}</dd></div>

        <template v-if="c.categorie === 'artiste'">
          <div>
            <dt>Cachets</dt>
            <dd>
              <span class="chiffre">{{ c.cachets_nb }} × {{ montant(c.cachets_montant) }}</span>
              <span class="sous"> — {{ libelle(CACHET_TYPES, c.cachets_type) }}, {{ libelle(BASES, c.cachets_base) }}</span>
            </dd>
          </div>
          <div v-if="c.services_nb">
            <dt>Services de répétition</dt>
            <dd>
              <span class="chiffre">{{ c.services_nb }} × {{ montant(c.services_montant) }}</span>
              <span class="sous"> — {{ libelle(SERVICE_TYPES, c.services_type) }}, {{ libelle(BASES, c.services_base) }}</span>
            </dd>
          </div>
        </template>

        <div v-else>
          <dt>Heures</dt>
          <dd>
            <span class="chiffre">{{ c.heures_nb }} h × {{ montant(c.heures_montant) }}</span>
            <span class="sous"> — {{ libelle(BASES, c.heures_base) }}</span>
          </dd>
        </div>

        <div><dt>Lieu</dt><dd>{{ c.commune }} <span class="sous">({{ c.departement }})</span></dd></div>
      </dl>

      <div v-if="c.dossier_paie_requis && !demande.paie_purgee_at" class="paie">
        <p v-if="!paie[c.id]" class="mention">
          Dossier paie à créer.
          <button class="lien" :disabled="chargePaie === c.id" @click="afficherPaie(c.id)">
            {{ chargePaie === c.id ? 'Ouverture…' : 'Afficher les éléments (consultation tracée)' }}
          </button>
        </p>
        <dl v-else>
          <div><dt>Téléphone</dt><dd>{{ paie[c.id].telephone }}</dd></div>
          <div><dt>E-mail</dt><dd>{{ paie[c.id].email }}</dd></div>
          <div>
            <dt>Adresse</dt>
            <dd>
              {{ paie[c.id].adresse1 }}
              <template v-if="paie[c.id].adresse2"><br />{{ paie[c.id].adresse2 }}</template>
              <br />{{ paie[c.id].code_postal }} {{ paie[c.id].ville }} · {{ paie[c.id].pays }}
            </dd>
          </div>
          <div><dt>Naissance</dt><dd class="chiffre">{{ jour(paie[c.id].naissance_date) }}</dd></div>
          <div>
            <dt>Lieu de naissance</dt>
            <dd>{{ paie[c.id].naissance_ville }} · {{ paie[c.id].naissance_pays }}</dd>
          </div>
          <div>
            <dt>Congés Spectacles</dt>
            <dd class="chiffre">{{ paie[c.id].conges_spectacles || '—' }}</dd>
          </div>
          <div><dt>N° sécurité sociale</dt><dd class="chiffre">{{ paie[c.id].nir }}</dd></div>
          <div><dt>IBAN</dt><dd class="chiffre">{{ paie[c.id].iban }}</dd></div>
        </dl>
      </div>
      <p v-else-if="c.dossier_paie_requis" class="mention effacee">
        Les éléments du dossier paie de ce salarié ont été effacés.
      </p>
    </section>
  </main>

  <main class="page" v-else-if="chargement"><p>Chargement…</p></main>
  <main class="page" v-else><p class="err bandeau">{{ erreur || 'Demande introuvable.' }}</p></main>
</template>
