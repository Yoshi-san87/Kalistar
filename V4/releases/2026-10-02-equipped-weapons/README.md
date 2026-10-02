# Kalistar V4.3.6 - Armes equipees

Push demande le 2 octobre 2026 sur le depot personnel `Yoshi-san87/Kalistar`.
Version PC et smartphone : **4.3.6**, tag : `v4.3.6`.

## Perimetre

- Onglet Armes : mini-cartes horizontales, details, porteurs compatibles,
  equipement, desequipement et confirmation de remplacement/deplacement.
- Hache du Roi Dechu pour `balmhyr` : +30 ATK lorsque seul sur son plateau.
- La Flute des Petits Bonheurs pour `momo` : apres un nouveau Retry ou Mana,
  +30 DEF au beneficiaire pour son prochain duel, puis consommation.
- Profils IndexedDB existants, migration additive et sauvegardes compatibles.
  Definitions et equipements captures au debut de chaque match.
- Indications dans le deck et le carnet, calcul moteur reel, journal et recap.
- Medaillon issu des sources natives validees, ancrage au crop de la carte,
  activation, repli, impulsion et notes de soutien discretes.
- Navigation mobile a cinq cibles et menu Plus ; Reduced Motion et nettoyage.

La matrice des armes de base, les cartes imprimees, leurs PSD/PNG et leurs
verrous restent inchanges. Aucun Job ou inventaire RPG ajoute. Catalogue :
193 cartes, 28 arenes, edition V4 et schema de partie 6 conserves.

## Verification

Le [rapport de feature](../../site/verification/weapons/REPORT.md) conserve
les mesures et captures initiales. Le
[guide d'equipement](../../docs/ARMES_EQUIPEES.md) documente les schemas,
conditions, reprises et l'ajout d'une troisieme arme.

13 tests Armes, 12 rencontres equipees completes et les regressions pertinentes
du moteur sont valides. Le parcours navigateur couvre desktop 1440 x 900,
Razr 50 412 x 1007, Reduced Motion 390 x 844 et compact 320 x 568, avec
profils et bases QA jetables. Il couvre le briefing reel, les confirmations,
la persistance, les bonus reels, l'adversaire, le zoom, le resize et le nettoyage.
Les memes parcours sont verifies sur les fichiers Pages construits.

La validation de release utilise la Story deja publiee et les fichiers Story
du commit via les overlays en lecture seule de `2026-10-02-pages-portability`.
Elle ne remplace aucun fichier de la reecriture locale de 80 000 mots.
Les nouveaux tests de provenance recuperent uniquement la frame et les deux
banques natives necessaires en plus des medias jouables habituels.

## Publication

Branche `main` et tag sont pousses ensemble, sans force, apres verification
du contenu du commit et du build. Le workflow Pages doit reussir pour publier
la nouvelle version ; son declenchement seul ne prouve pas le deploiement.
Les controles publics portent sur le numero PC/mobile, les modules Armes,
les trois medias derives et la presence des deux objets dans la vue Armes.

La Story en cours, ses notes locales et les autres captures hors du lot Armes
restent hors du commit. La documentation du site ne stage que la nouvelle
section Armes, sans embarquer les paragraphes Story non publies.
