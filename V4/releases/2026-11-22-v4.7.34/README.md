# Kalistar 4.7.34 - Catalogue et propositions Collection

## Livrable

- Catalogue : nom seul et dos grise pour les versions jamais obtenues. Pas de
  chargement de leur illustration par les vignettes, versions, sommaire ou hasard.
- Decouverte par version, conservee apres transfert. Projection des possessions
  et des transferts acceptes, deja stockes dans le registre Supabase. Les offres
  en attente, refusees ou annulees ne revelent rien au destinataire.
- Administrateur : catalogue complet selon le role serveur, sans dependance au
  nom du profil. Aucun changement des regles de possession ou de progression.
- Six maquettes Collection dans
  `../../propositions/2026-11-22-collection-six-concepts/`. PNG locaux uniquement,
  non distribues. Aucune refonte de Mes cartes n'est appliquee sans selection.

## Verification

Le test `catalogue-discovery.browser.test.cjs` utilise PostgreSQL isole et Chrome
jetable. Il couvre les deux roles, reception puis renvoi d'un exemplaire,
nouvelle lecture des decouvertes, absence des images/titres inconnus, lecteur,
sommaire, hasard et permutation. Formats PC, grand PC, Razr, 320 px, paysage et
Reduced Motion. Les comptes et collections de production ne sont pas touches.

Avant preparation : 107 invocations CI et 14 invocations locales passees.
Collection existante : lecteur, PNG natif, versions et animations sur sept
formats. Nouveau Catalogue : cinq formats. Connexion integree : PC, Razr,
320 px et Reduced Motion, avec Tokyo, reload et deconnexion. Le simulateur
Auth prend aussi en charge le renouvellement normal des jetons de test.
Le build fige repasse les controles du site et du Catalogue avant mise en ligne.
Preuves sous `work/qa/catalogue-discovery/`. La version n'affecte ni le schema
de sauvegarde ni les medias natifs approuves.
