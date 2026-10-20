# Riko

Deux cartes originales approuvees par l'auteur le 20 octobre 2026, a partir
d'Orilo, renomme **Riko**. Ce nom remplace la proposition, pas un ancien modele
publie. Identite stable commune : `riko-kalistar`. Aucun nouveau peuple,
cristal, drapeau, equipement ou effet moteur.

| Modele | Version | Metier | Role principal | Positions |
| --- | --- | --- | --- | --- |
| 49903201 | L'horizon dans la poche | Navigateur | P5 | P3, P5 |
| 49903202 | Des ailes autrement | Pilote | P3 | P3, P4 |

Les deux cartes sont KORBOW, Nestown, AERO. Elles comptent pour un seul
personnage dans la Collection et ne peuvent pas cohabiter dans un deck.

## Personnage

Ne sans ailes, Riko a grandi sous les prejuges de certains de ses compatriotes.
Ces insultes ne definissent pas sa valeur. Il est devenu un pilote talentueux
sur les routes locales de Nestown ; sa connaissance du reste d'Astralia vient
des atlas, pas d'un grand voyage deja accompli. Il fanfaronne pour masquer son
inquietude, s'enthousiasme, prepare des itineraires et reve de partir.

La rencontre avec Kaylis reste une piste narrative : elle pourrait lui demander
ou il veut aller plutot que ce qui lui manque. Aucun chapitre du roman, aucun
evenement deja canonique ni pouvoir de resurrection n'est modifie ici.

## Illustrations

Deux retouches `image_gen` integre, sans API externe. Les prompts exacts et
chemins des trois references sont dans `relais.generation.json` et
`en-vol.generation.json`. Les originaux de toutes les iterations d'Orilo restent
dans le lot de propositions `2026-10-20-kaylis-rencontres`, non publie.

La passe finale conserve les scenes approuvees : harnais et sacoche au sol au
relais ; tete tournee vers le ciel et cockpit corrige en vol. Momo et Valazar
servent uniquement de references picturales. Aucun cadre natif n'est genere.
Illustrations finales dans `images/`, cartes editables dans `cards/`.

## Choix De Jeu

Au relais : Garde D4, Trefle D2, Potion D1. Trois attaques numeriques modestes,
deux faces Aero et deux barrieres, sans esquive ni Mort. La girouette a Kalistel
utilise la famille Sceptre existante.

En vol : Middle, Puissance physique D3, esquive DEF D4 et Retry DEF D1.
Deux attaques Aero, une barriere. Poing pour le pilote sans arme en main ;
aucun fusil n'est invente dans la scene. Le vol reste narratif, pas une
invulnerabilite. La Garde est absente car son role principal est P3.

`set.json` conserve les valeurs D6 vers D1 et leur justification. Les nombres
respectent les bornes par role, sans recopier les plafonds. Ces choix sont
verifies fonctionnellement, pas annonces comme un equilibrage competitif prouve.

## Production Et Preuves

Le pilote natif reprend le parcours stable des lots precedents. Composition
897 x 1497, illustration 737 x 921, textes editables, objets dynamiques et
effets separes. Icones blanches actuelles adaptees avant gel des entrees.
`before.json` conserve le catalogue precedent et les SHA-256 des entrees.
Ne pas le regenerer pour masquer une modification.

Le premier appel Photoshop confine ne pouvait pas acceder au pont COM.
Le meme pilote a reussi hors confinement, sans modification des scripts.

Commandes de controle :

```powershell
node --test V4/expansions/2026-10-20-riko/integration.test.cjs V4/expansions/2026-10-20-riko/native.test.cjs V4/expansions/2026-10-20-riko/publication.test.cjs
node V4/expansions/2026-10-20-riko/gallery.browser.test.cjs
node V4/expansions/2026-10-20-riko/game.browser.test.cjs
```

Tests : deux versions/identite unique, interdiction du doublon dans le deck,
chaque face ATK/DEF, soutiens, journal, barrieres, deux matchs ABBA complets,
reprise JSON, preuves natives, ancien catalogue intact et medias publiables.
Preuves navigateur sous `work/qa/riko/`, profils jetables uniquement.
Publication versionnee documentee dans le rapport de livraison.
