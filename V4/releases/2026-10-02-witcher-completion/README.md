# Kalistar V4.3.1 - Vesemir et Sanji

Demande du 2 octobre 2026. Publication publique GitHub et Pages explicitement
confirmee par l'utilisateur, apres clarification de son usage prive.

## Cartes

- Vesemir 49900106 : P1, Humain, Roche, Epee longue. Profil numerique, titre,
  description et capacites conserves depuis le lot Witcher prepare. Illustration
  peinte a Kaer Morhen, mentor reparant un gant, expression paternelle.
- Sanji 49800301 : nouvelle illustration 02, raccord bassin/cuisse, genou,
  cheville et appui redessines. Aucun champ de profil ni statistique modifie.
  La source originale reste preservee ; la source actuelle est indiquee par
  `nativeRevision.artworkSource` dans le catalogue.
- Geralt 49900101 et 49900102 : toujours en attente. Les deux nouveaux essais
  du service image ont ete bloques en sortie. Aucune illustration de substitution,
  aucun changement de nom et aucune publication de carte incomplete.

## Production

Le lot additif est `V4/expansions/2026-10-02-witcher-completion/`.
La revision illustration seule est `V4/revisions/2026-10-02-sanji-legs/`.
Les prompts exacts, references, empreintes et refus sont conserves ici.
Photoshop 26.11.7 : PSD editables, objets dynamiques incorpores, polices natives,
reouverture, code-barres effectivement decode et composants controles.
Sanji : zero pixel modifie hors de l'illustration et zero changement de texte,
style natif, geometrie ou composants fixes.

Le nouveau snapshot precede l'ajout de Vesemir et la revision Sanji. Il n'est
jamais refige : l'audit final exclut explicitement la seule revision Sanji,
valide sa preuve et compare toutes les autres creations au snapshot original.
Le verrou des references approuvees n'est pas modifie.

## Verification Et Publication

Catalogue attendu : 190 cartes, 28 arenes ; filtre Witcher : cinq personnages,
cinq versions. Version visible 4.3.1, edition et schema de sauvegarde V4.

`audit.json`, tests natifs, captures `qa/local/` et `qa/public/`, et
`publication/public-check.json` documentent les controles realises. Ces fichiers
ne doivent pas etre presentes comme des preuves avant leur production.

Les changements d'histoire et d'interface locaux en cours sont exclus du commit.
Les helpers de build et de regression les remplacent uniquement en lecture par
leurs fichiers Git publies, sans toucher au contenu local. La CI teste le commit
reel, sans cet overlay. Les images jouables, le catalogue et les mentions 4.3.1
testes restent les nouvelles sorties locales.

Publication contenu : commit `45eab479cfa179c832f6fc57194de5ad91124f68`,
workflow GitHub `36940855192` reussi. Les 477 fichiers du manifeste public
correspondent au build local ; les deux PNG ont aussi ete compares apres
telechargement. Quatre vues locales et quatre vues publiques, sans erreur ni
debordement, ainsi que 67 tests de regression et quatre tests de ce lot passent.
902 fichiers des autres creations et toutes les references protegees restent
identiques. Les preuves publiques archivees attestent ce commit de contenu ;
un commit subsequent ajoute uniquement leur archivage.
