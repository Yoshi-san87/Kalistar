# Balmhyr : le retour et le Gant de Fer

Publication 4.6.111. Trame et recompenses validees par l'auteur le 22 octobre
2026. Ce lot modifie le Fragment, pas le roman ni les cartes natives.

## Parcours

1. Lok refuse de rester le frere cadet, trahit Balmhyr et le fait disparaitre.
2. Le confinement magnetique lui interdit le retour a Durane, sans cachot.
3. Kaylis l'aide a franchir la limite, sans promettre de resoudre tous ses obstacles.
4. Retrouvailles avec Madania et le Gant qu'il avait cache chez elle avant l'exil.
5. La Hache du Roi Dechu et la preparation du retour.
6. Le Rempart de Durane et le passage vers le Conseil.
7. Lok, capitaine adverse au Trone de Fer, est vaincu et laisse vivant sous garde.

Les quatre premieres victoires donnent Balmhyr `30000007`, Le royaume a
l'horizon. Sa famille Hache permet de porter ensemble les trois recompenses.
La carte `49900802` reste une version Poing distincte ; son illustration sert
toujours a la scene des retrouvailles, sans remplacer les exemplaires possedes.
Les bonus restent caches puis sont reveles et acquittes chapitre par chapitre.
Le Gant est retrouve dans le recit avant d'etre attribue comme equipement jouable
apres la finale. Aucun deces de Lok, nouveau couronnement ou apres-guerre invente.

Les decks natifs utilisent dix personnages distincts, deux compatibilites par
position et un capitaine actif. Les cartes sont des tableaux de la scene,
pas l'affirmation de nouvelles alliances canoniques. Aucun des truque, bonus
cache ou changement des chiffres imprimes. Momo et Kaylis restent inchanges.

## Equipements et continuite

- Arme : `fallen-king-axe`, +30 ATK sur un 6 numerique conserve.
- Protection : `durane-rampart`, +30 DEF sur un 6 numerique courant.
- Relique : `mythic-iron-gauntlet`, renommee Gant de Fer. Apres une attaque
  survecue en inferiorite numerique, prepare +40 ATK pour la prochaine attaque
  numerique conservee, une seule fois par partie. Moteur declaratif existant.

Le Gant est compatible avec toutes les versions de Balmhyr ; la Hache garde
sa restriction de famille. Une ancienne affectation du Gant comme arme devient
une affectation de relique seulement si ce slot est libre. Une relique deja
choisie est prioritaire : aucun objet ni droit de possession n'est supprime.
Les matchs figes gardent leurs anciennes definitions et formules.

La migration `202610220014_balmhyr_iron_gauntlet.sql` (schema 13) change les
recompenses futures. Elle ne touche ni aux specimens existants ni aux claims
de cartes. Les anciens bonus gagnes recoivent leur nouvelle recompense sans
perdre l'ancien objet. Le recu precedent est conserve dans le journal prive
`journey_reward_adjustments`; les acquittements et dates restent stables.
Transaction, verrou de profil, RLS et rejouabilite sont testes en PostgreSQL.

## Medias

`prepare-cover.cjs` encode la peinture Canyonero approuvee pour la nouvelle
couverture. Aucun dessin genere ou retouche : largeur 900 px, WebP 438 298 octets.
La peinture originale, l'ancienne couverture Poing et leurs empreintes restent
intactes. `cover-provenance.json` et le registre runtime en fixent les sources.
La copie externe accompagne la sauvegarde privee chiffree avant migration.

## Correction coordonnee

La popup de conflit de sauvegardes, demandee dans l'autre chat Kalistar,
associe chaque source, date et action dans un meme bouton : appareil a gauche,
compte a droite, puis empilement sur telephone. Aucun choix automatique et
aucune modification du moteur de synchronisation. Le focus reste stable lors
du rafraichissement des dates. Tests PC, Razr, 360, 320 et paysage.

## Verification

### Comparaison des decks

1008 matchs termines, zero nul ou blocage, maximum 64 tours : sept etapes,
trois adversaires natifs fixes, 24 graines communes et inversion des camps.
Taux de victoire du deck de l'episode : 10,4 %, 30,6 %, 41,7 %, 47,2 %,
puis 38,2 %, 32,6 % et 22,9 %. Les quatre combats de carte progressent dans
cette moyenne ; les trois chapitres bonus ne sont pas une hausse continue.
Le Lok final gagne 18 matchs de plus que celui de l'ouverture sur les memes
oppositions, mais n'est pas le pic de difficulte du livre.

Une recherche separee de placements natifs pour Lok n'a pas justifie de
changement : sur 144 matchs de confirmation a graines inedites, le candidat
gagne 36 matchs contre 34 pour la composition retenue, avec un recul face
au deck Cryo. La composition initialement testee est donc conservee.
Ce sont des mesures descriptives de trois oppositions IA, sans equipement,
pas une preuve d'optimalite universelle ou un taux garanti pour Tokyo.

Reproduction de la comparaison principale :

```powershell
$env:KALISTAR_JOURNEY_BALANCE='1'
$env:KALISTAR_JOURNEY_BALANCE_BOOK='balmhyr-retour'
node --test --test-name-pattern='optional paired comparison' V4/revisions/2026-10-22-fragment-adventure/decks.test.cjs
```

Le rapport va dans `work/balmhyr-story/balance.json`; les anciennes preuves
globales de l'aventure restent intactes. Les 283 actions d'un ancien match
avec Gant arme sont rejouees avec leurs empreintes exactes. Les 21 combats
actuels sont termines et restaures par les tests cibles.

### Integration

Les tests cibles couvrent la migration et sa restauration, les verrous de
progression, les recompenses compatibles, l'usage unique du Gant, les anciens
profils et le rejeu d'un ancien match. Les preuves historiques ne sont pas
recalibrees sur les nouveaux decks. La publication utilise un build fige du
commit, verifie sur PC et telephone avant deploiement Cloudflare personnel.
