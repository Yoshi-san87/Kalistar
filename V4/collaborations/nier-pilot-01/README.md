# Kalistar x NieR - pilote 01

Pilote prive non officiel : deux cartes seulement, sans nouvelle arene ni preset
de deck. Deux cartes ne constituent pas un deck jouable.

| Carte | ID | Race | Arme | Cristal | Positions | Role principal |
| --- | --- | --- | --- | --- | --- | --- |
| 2B | 45911726 | ANDROID | Katana | LUXO | P2 | P2 |
| 9S | 42138845 | ANDROID | Lance | ELECTRO | P3, P5 | Support P5 |

9S conserve Reraise. Les valeurs exactes sont dans `set.json`, controlees par
`model.cjs` contre `V3/donnees/regles_demo.json`. Aucun changement de moteur.
Faction distincte `NieR`, avec la synergie ATK existante, sans bonus special.

## Sources et priorite

La derniere decision utilisateur prime, puis les
[consignes V4](../../AGENTS.md), le [guide de reprise](../../../docs/GUIDE_REPRISE.md)
et les [regles](../../docs/REGLES_JEU.md). Les verrous de references et de
composants restent inchanges ; ne jamais actualiser leurs hashes pour masquer
une difference. Les anciens rapports de fabrication ne sont pas des instructions.

`art/{2b,9s,ANDROID,flag-source}.png` et `provenance.json` sont fournis par le
parent. CYBORG vient de `V3/assets/races/CYBORG.png`, Katana du pictogramme V3
`assets/revisions-buffs-scenes-20260914/armes/18.png`, sans modification des sources.
`assets.cjs` reutilise l'email natif FF7 et le masque exact du fanion FF7.
Ancre : 65 % centroide luminance-alpha / 35 % centre des bornes visibles
(alpha >= 16), erreur <= 0,75 px ; tout pixel alpha non nul reste dans un rayon
de 39 px. Le fanion compact mesure 98 x 223 px, place a (672, 829).

## Production

Commandes depuis la racine Kalistar, une seule operation native a la fois :

```powershell
node V4/collaborations/nier-pilot-01/assets.cjs
node V4/collaborations/nier-pilot-01/build.cjs check
node V4/collaborations/nier-pilot-01/build.cjs prepare
node V4/collaborations/nier-pilot-01/build.cjs render
node V4/collaborations/nier-pilot-01/build.cjs verify
node V4/collaborations/nier-pilot-01/publish.cjs
```

`render` ouvre Photoshop ; `publish.cjs` seul est un preflight en lecture seule.
Les commandes `build.cjs` acceptent aussi la cle `2b` ou `9s` en dernier argument.
Apres `prepare`, geler tous les fichiers enumeres dans
`cards/<cle>/preparation.json.inputs`. Ne pas relancer `assets.cjs` pendant un
rendu. Toute modification exige une nouvelle preparation, pas un rafraichissement
manuel des empreintes. Les README ne sont pas des entrees de composition.

Le parent coordonne le rendu, la revue visuelle et les commandes finales :

```powershell
node V4/collaborations/nier-pilot-01/assets.cjs --install
node V4/collaborations/nier-pilot-01/publish.cjs --publish
```

`--install` ajoute les options ANDROID/CYBORG via une extension distincte de la
banque verrouillee ; il refuse de remplacer une extension existante. Les PNG du
site sont `V4/site/assets/races/ANDROID.png` et `V4/site/assets/factions/NieR.png`.
La [revision Barret](../../revisions/2026-09-23-barret-cyborg/README.md) doit etre
publiee avant NieR si elle a deja fige son snapshot du catalogue.

## Preuves et etat

Sorties : `cards/<cle>/card.psd`, `card.png`, profil et preuves. Les gates exigent
897 x 1497 a 300 dpi, textes natifs, objets dynamiques, cadre/composants conformes,
PSD rouvert identique et lecture du code-barres. Les tests utilisent le moteur et
des publications en memoire, sans modifier les sauvegardes du navigateur.

Ce README ne certifie aucune publication. Verifier les preuves par carte, puis
le preflight, `V4/donnees/catalogue.json` et les dossiers `V4/creations/<id>/`.
La presence d'un PSD ou d'un dossier `publication/` ne suffit pas. La validation
artistique et la QA navigateur relevent du parent ; aucune nouvelle generation
ni publication automatique n'est demandee par ce document.

## Typographie native

La [revision typographique](../../revisions/2026-09-23-nier-typography/README.md)
remplace Augustus sur les noms courts 2B/9S par la serif du cadre, lisible avec
des chiffres. Les titres de version sont en capitales natives, avec leur
echelle de reference conservee. `typography.jsx` et `typography.cjs` pilotent
composition, apercu et verification : ne pas corriger uniquement un PNG.
