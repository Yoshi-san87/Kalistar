# Verification Armes - 2 octobre 2026

## Livraison Locale

Deux armes reelles dans `/jeu/#weapons`, equipees par profil local :
Hache du Roi Dechu / Balmhyr (+30 ATK dernier combattant actif) et
La Flute des Petits Bonheurs / Momo (nouveau Retry ou Mana, +30 DEF au
beneficiaire pour son prochain duel). Aucun objet Job ni changement de matchup.

Catalogue, regles pures, transactions, interface et animations sont separes.
Le deck et le carnet indiquent l'equipement ; le moteur, le recapitulatif et
le journal utilisent les modificateurs reels. Les parties conservent leur
snapshot, y compris les definitions et les charges temporaires.

Les PNG/PSD des personnages n'ont pas ete modifies. `git diff --name-only`
est vide pour le manifeste des composants, `icon-layouts.json` et le verrou
`references.json`. Les trois WebP nouveaux viennent de la frame/cuivre et
des banques Hache/Instrument approuvees : voir `media-provenance.json`.

## Controles Passes

- 13 tests `equipment.test.cjs` : characterId, Job/famille, versions de Momo,
  incompatibilite, remplacement/deplacement, snapshots, anciennes parties,
  activation/desactivation, chiffres reels, journal, Retry/Mana, relances,
  consommation, effets speciaux, adversaire et 12 rencontres completes.
- 51 controles dans le lot moteur/catalogue/collaborations/statistiques/PWA,
  incluant les 13 tests ci-dessus. Parite des mecaniques V3 et matrice conservee.
- `kalistel.test.cjs` : huit rencontres completes et conservation des regles
  des eclats. `arena-ambience.test.cjs` passe egalement.
- `collection-versions.test.cjs` et `reader-legibility.test.cjs` : sept
  formats chacun, editions, lisibilite et debordements.
- `weapons.browser.test.cjs` : desktop 1440 x 900, Razr 50 412 x 1007,
  Reduced Motion 390 x 844 et ecran compact 320 x 568.
- Le meme parcours navigateur passe sur le build statique sous `/Kalistar/` :
  assets, navigation, briefing reel, sauvegardes, duels et nettoyage. Tous les
  fichiers sont servis par des routes de test depuis `V4/deploy/dist`.
- Upgrade en place d'une ancienne base sans equipement, preservation d'un
  store existant, sauvegarde/reload, anciens backups et import invalide atomique.
- Equipement/desequipement, profil Paris/Tokyo isole, confirmation obsolete
  refusee. Remplacement, annulation et changement de porteur testes dans la
  vraie UI avec une definition QA et un profil en memoire, jamais publies.
- Hache active sur le dernier survivant obtenu par des resolutions moteur,
  +30 ATK dans une vraie formule UI, adversaire equipe, Flute apres soutien,
  +30 DEF dans le moteur, conservation puis consommation apres reload.
- Ancrage exact au crop et a la carte transformee : challenger, resize pendant
  activation et zoom plateau 125 %. Erreur maximale mesuree : 0,052 px sur
  les centres/dimensions, en local comme dans le build.
- Repli avant disparition, absence totale d'overlay inactif, absence de
  rotation persistante en Reduced Motion et nettoyage lors de navigation.
- Aucun `pageerror` dans les parcours Armes. Les cinq cibles de navigation
  Razr mesurent 60 px de haut et environ 82 px de large.

Tests navigateur : Chrome headless, contextes jetables, noms IndexedDB suffixes
`-weapons-qa-only`. Aucun stockage du navigateur personnel utilise. Les
fixtures de combat refusent de remplacer un match non marque QA.

## Captures Et Preuves

- [Page desktop](desktop-arsenal.png) / [page Razr](razr50-arsenal.png).
- [Detail desktop](desktop-weapon-detail.png) / [detail Razr](razr50-weapon-detail.png).
- [Carte normale desktop](desktop-normal-cards.png) / [carte normale Razr](razr50-normal-cards.png).
- [Hache en focus desktop](desktop-axe-challenger.png) / [Hache Razr](razr50-axe-challenger.png).
- [Soutien Flute desktop](desktop-flute-support.png) / [soutien Flute Razr](razr50-flute-support.png).
- Variantes `reduced-*` et `compact-*` dans ce dossier ; captures du build
  dans `pages/`. Mesures et resultats dans `results.json` et `pages/results.json`.

Les captures stables ont ete regardees manuellement : cercle cuivre natif,
motif Instrument existant, petite plaque attachee, pas de badge generique.
L'icone Instrument imprimee est conservee, sans redessiner une flute
approximative a la place de la banque validee.

## Build Et Limites

`node V4/deploy/build.cjs` termine avec succes : **193 cartes, 489 fichiers,
474 Mo**, dans `V4/deploy/dist`. Les empreintes des PNG approuves sont verifiees
par le build. Scripts de test, documents, preuves et sources Atelier ne sont
pas publies. La CI ajoute les tests Armes et recupere seulement trois petits
fichiers sources natifs supplementaires pour verifier leur provenance.

Des assertions globales historiques ne passent pas dans le checkout courant :

- `build.test.cjs` : attend 10 sections Story ; le travail Story deja present
  en contient 18. Les quatre autres tests de ce fichier passent.
- `browser.test.cjs` : attend l'ancien titre `Kalistar V4`, contre le titre
  versionne actuel `Kalistar V4.3.5`. Le script s'arrete a cette assertion.
- `catalogue-evolution.test.cjs` : sa fixture Voloden attend une seule addition
  depuis un ancien verrou, mais le catalogue actuel comporte d'autres
  references approuvees. Ses scripts charges directement ont ete raccordes
  aux nouvelles dependances ; sa reference historique n'a pas ete reecrite.

Ces anciens verrous/assertions/rapports ne sont pas modifies pour simuler un
succes. Les autres portions des scripts arretes ne sont pas declarees passees.
Le travail Story et les autres changements preexistants sont preserves.

La version reste 4.3.5 : aucun commit, tag, push ou deploiement en ligne n'a
ete effectue dans cette livraison. Un push autorise devra incrementer la
version, inclure les notes de release et faire l'objet de sa validation.

Documentation des schemas et ajout d'une troisieme arme :
[ARMES_EQUIPEES.md](../../../docs/ARMES_EQUIPEES.md).
