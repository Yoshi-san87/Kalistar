# Kalistar 4.6.78 - Atlas Collection synchronise

Demande de l'auteur : utiliser la carte actuelle en fond de Collection et
conserver ce lien lors des prochaines publications Map.

`site-config.js` fournit une seule URL `KalistarSite.atlas`, actuellement
la map approuvee 1.39. La Map l'utilise pour son image ; Collection et ses
miniatures de pages utilisent sa variable CSS `--kalistar-atlas-image`.
Le flou de 1.6px, le cadrage proportionnel et les cartes nettes restent
inchanges. Les fiches personnage et Story gardent leur surface de lecture.

Pas de nouvelle image, regeneration, changement de terrain, d'icone ville,
de catalogue, de compte ou de sauvegarde. Les anciens fichiers sont preserves.
Le test d'hebergement compare la source partagee a `map/versions.json` pour
eviter qu'une prochaine publication mette a jour une vue sans l'autre.

## Verification et publication

Resultats avant commit : `validation.json`. Journaux, captures et rapport
final : `work/qa/collection-atlas-4.6.78/`. Les controles comprennent les
suites CI/locales, la Collection sur sept formats, sa pagination et ses
miniatures, le changement vers Map, le jeu PC/telephone et le login.

Publication du seul texte termine sur le depot personnel avec tag annote
`v4.6.78`, puis build du commit exact et envoi au projet Cloudflare existant
`kalistar`. Le Worker prive, les routes et les secrets Pages existants sont
conserves. Le controle anonyme public verifie le login versionne et le refus
des fichiers prives ; aucun mot de passe reel n'est automatise.
