# Kalistar V4.3.7 - Composition d'equipe

Livraison du 3 octobre 2026 pour le depot personnel Yoshi-san87/Kalistar.
Le tag de publication est `v4.3.7`.

## Experience livree

- Dix personnages, cinq titulaires P1-P5 et cinq reservistes polyvalents.
- Un capitaine obligatoire parmi les titulaires, couronne en deck et en arene.
- Commandement reel : +10 ATK faction / +10 DEF race si un autre allie actif
  partage le lien. Bonus non cumulable, retire a la mort definitive du capitaine.
- Recrutement Personnages / Armes, comparaison, drag, parcours tactile, yeux,
  compteurs de couverture, ADN actif et potentiel distinct des dix membres.
- Une arme maximum par personnage, loadout propre a chaque equipe, medaillon
  natif visible dans Decks sans languette. Conditions de combat inchangees.
- Hache du Roi Dechu et Flute des Petits Bonheurs : designs uniques integres,
  flute traversiere avec incandescence electrique douce. Aucune carte native
  ni matrice d'armes de base modifiee.
- Nouvelle rencontre directement sur la formation sauvegardee, sans seconde
  phase de placement. Journal, recaps, IA et reprise utilisent les vrais bonus.

## Architecture, schema et migration

Voir [COMPOSITION_EQUIPE.md](../../docs/COMPOSITION_EQUIPE.md) pour le contrat
complet et [ARMES_EQUIPEES.md](../../docs/ARMES_EQUIPEES.md) pour ajouter une arme.

L'enveloppe Deck schema 2 ajoute `formation`, `captain` et `equipment` aux
`id`, `name`, `cards` existants. `team-composition.js` fournit la couche pure;
`deck-library.js` conserve la cle locale et les ecritures atomiques;
`engine.js` applique la formation et le commandement sans DOM.

Les anciens decks sont migres une seule fois sans perdre de membre. Leur
capitaine reste nul : le joueur doit le choisir avant de lancer une partie.
Un brouillon incomplet ou invalide reste enregistrable et reparable, mais
n'est pas jouable. Les anciennes rencontres schema 6 gardent leurs regles;
les nouvelles ajoutent un snapshot `composition.version = 1`, formations et
armes comprises. Aucun changement ulterieur de deck ne modifie un match.

## Verifications executees

- 29 tests dedies : 14 Composition et 15 Equipement, tous passes.
- 32 entrees passees dans la commande regroupee incluant aussi Kalistel,
  ambiance d'arene et medailles; rencontres completes dans les suites moteur.
- 75 tests catalogue, moteur, publication, statistiques et PWA passes via
  `2026-10-02-pages-portability/test-committed-story.cjs`.
- Navigateur Composition passe en local puis sur le site construit :
  creation de dix membres, captain, liens, equipement, sauvegarde/reload,
  duplication, JSON, permutations, refus incompatible, comparaison, annuler /
  retablir, touch, drag, preview Razr et geometrie des deux medaillons.
- Scenario complet sur le site construit : formation explicite au lancement,
  duel numerique et bonus du capitaine, remplacement depuis la reserve,
  mort du capitaine, reprises, fin de match et palmares sans corruption.
- Navigateur Armes passe en local puis sur le site construit : equiper,
  remplacer / annuler / deplacer / desequiper, restrictions, migration DB,
  Hache dernier survivant, Flute support +30 DEF transmis puis consomme,
  journal, challenger, adversaire, resize, zoom et mouvement reduit.
- Navigateur de publication general passe sur le site construit, avec
  sauvegardes, briefing, IA, arene et absence de plein ecran automatique.
- Aucune erreur JavaScript ou requete HTTP manquante dans les scenarios QA.

Formats Composition : 320x800, 360x800, 390x844, 412x1007 (Razr 50),
430x932, 844x390, 1440x900 et 1920x1080. Armes : 1440x900, 412x1007,
390x844 avec mouvement reduit, 320x568.

Construction GitHub Pages : 193 cartes, 493 medias, environ 474 Mio.
Les tests emploient des contextes et bases QA separes du navigateur personnel.
La construction locale utilise les sources Story deja commitees sans toucher
au roman encore en cours dans le dossier de travail.

## Captures

- [Avant PC](../../site/verification/team-composition/before-desktop.png)
- [Avant smartphone](../../site/verification/team-composition/before-phone.png)
- [Apres PC, site construit](../../site/verification/team-composition/pages/after-desktop.png)
- [Apres Razr, site construit](../../site/verification/team-composition/pages/after-412.png)
- [Paysage court](../../site/verification/team-composition/pages/after-844.png)
- [Recrutement Armes](../../site/verification/team-composition/pages/weapons-412.png)
- [Duel capitaine PC](../../site/verification/team-composition/pages/arena-captain-desktop.png)
- [Duel capitaine smartphone](../../site/verification/team-composition/pages/arena-captain-phone.png)
- [Fin de match](../../site/verification/team-composition/pages/completed-phone.png)
- [Arsenal unique](../../site/verification/team-composition/weapons-pages/desktop-arsenal.png)
- [Hache en duel Razr](../../site/verification/team-composition/weapons-pages/razr50-axe-challenger.png)
- [Flute en soutien Razr](../../site/verification/team-composition/weapons-pages/razr50-flute-support.png)

Les resultats structures sont dans `pages/results.json` et
`weapons-pages/results.json`. La provenance des dessins est conservee dans
[la revision des armes](../../revisions/2026-10-02-unique-weapon-art/README.md).

## Groupes de fichiers modifies

- Donnees/regles : `site/team-composition.js`, `deck-library.js`, `engine.js`,
  `equipment.js`, `weapons.js`.
- Interface : `site/deck-builder.js`, `team-composition.css`, `app.js`,
  `boot.js`, `index.html`, `v4.css`, `equipment-presentation.js`.
- Medias : `site/assets/equipment/*-v2.webp`, `build-weapon-art.cjs`, revision
  `2026-10-02-unique-weapon-art/` avec sources, prompts et provenance.
- Validation : tests Composition, Equipement et navigateur, assertions de
  publication/version, captures, `.github/workflows/pages.yml`.
- Documentation : Composition, Armes equipees, regles du jeu, ce rapport.

## Limites explicites

Les deux armes test restent disponibles sans inventaire d'armes distinct.
La page Armes conserve les preferences globales historiques; Decks est
l'autorite des loadouts utilises dans les nouvelles rencontres.
Pas de Jobs, talents, duo de positions ni equipements multiples.
Les captures sont des controles Chrome automatises avec inspection visuelle,
pas une validation sur appareil Android physique. L'equilibrage +10 respecte
le brief mais ne constitue pas une mesure de taux de victoire.
