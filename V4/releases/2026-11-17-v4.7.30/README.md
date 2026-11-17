# Kalistar 4.7.30 - L'arene prend vie

- Theme d'arene Brass Fight Call, transition depuis les menus, sans superposition.
- Effets courts sur les actions reelles, jamais sur un simple rechargement.
  Parametres independants pour musique et sons, limites de volume et de voix.
- Double battement cuivre/cristal autour du bouton utilisable. Pas de flash
  rapide, de changement de dimensions ou d'animation sur les boutons bloques.
- Penombre a l'engagement et pendant le jet : les deux combattants et le
  panneau restent lumineux. Retour au plateau normal a la selection suivante.
- Cercles ATK/DEF attaches au contenu peint, y compris apres le remplacement
  asynchrone du PNG natif par son recadrage et aux tailles fractionnaires.
  Observateurs et ecouteurs liberes au demontage.

Aucune modification de regles, de donnees Supabase, d'equilibrage, d'artwork
natif ou de possession. Pas de nouvel abonnement ou generation payante.
[Source sonore et conversion](../../revisions/2026-11-17-arena-score/README.md).

## Verification

Preuves reproductibles sous `work/qa/arena-living/`, profils jetables uniquement.
Tests unitaires audio : activation, refus autoplay, limite de voix, nettoyage,
navigation, retour d'historique et contexte inactif. Lecture MP3 native et
reprise des themes via les vrais boutons PC/Razr/320 px. Tests d'arene PC,
Razr, 320 px et paysage : clics reels, action entierement visible, deux cartes
eclairees, six ancrages sur les deux colonnes, Reduced Motion, coupure des sons
et nettoyage a la sortie. Reproduction explicite native -> recadree sur Momo.

Les accents n'ajoutent aucune boucle de rendu permanente. Le battement du
bouton anime uniquement l'opacite de deux bordures ; la penombre utilise la
couche d'ambiance existante. Le contexte sonore est suspendu au repos, en
arriere-plan et a l'ouverture d'une popup. Verification complete CI/locale,
puis tests du build fige avant deploiement Cloudflare personnel.

Avant preparation : 107 invocations CI et 14 invocations locales terminees sans
echec. Arene et ses six resultats testes sur quatre formats ; lecture native
sur trois formats ; parametres du compte sur cinq formats. Regression Momo
plein format -> recadrage passee. Les originaux et les verrous sont preserves.
