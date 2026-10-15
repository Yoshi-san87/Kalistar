# Typographie NieR - 23 septembre 2026

Correction native des seuls calques NOM et TITLE de 2B / 9S. Ni generation
d'image, ni caches peints sur le PNG, ni changement du cadre ou des profils.

## Regle de fabrication

Les chiffres d'Augustus rendaient ces deux noms alphanumeriques ambigus. La
production NieR utilise maintenant Times New Roman Regular, deja present dans
le cadre V4, a 10 pt pour ces noms courts. Les titres gardent leur police et
leur echelle native (7,68 pt avec la transformation approuvee du bas de carte),
et prennent le style natif ALLCAPS. Leur texte source reste identique.
Les deux calques sont centres a nouveau d'apres leurs bornes d'encre.

`V4/collaborations/nier-pilot-01/typography.jsx` applique les styles. Le
compositeur, l'apercu et le controle natif utilisent la meme regle. Les preuves
enregistrent police, taille, casse, tracking et faux styles apres reouverture.
Une substitution ou une casse incorrecte doit faire echouer la verification.

## Procedure et preuves

`revise.cjs prepare` conserve les originaux avant tout changement. `render`
edite des copies PSD, les sauvegarde, les ferme puis les rouvre. `verify`
controle chaque autre calque, tous les pixels hors NOM/TITLE, composants,
textes, centrages, dimensions, code-barres et profils. `publish` installe les
sorties verifiees dans les sources et creations, avec les nouvelles preuves.

Les anciennes preparations restent conservees dans `originals/`. Les nouvelles
preparations referencent explicitement cette revision et les entrees utilisees.
Le catalogue, les illustrations, les statistiques, les identites de collection
et les autres cartes, Barret compris, doivent rester byte-identiques. Les
verrous des references approuvees et de la banque ne sont jamais modifies.

Ne pas relancer `prepare` sur les originaux existants. L'etat effectif est
`transaction.json.state` ; seul `published` indique une installation terminee.

## Resultat publie

Transaction `published`, deux cartes mises a jour dans les sources et le jeu.
Les profils et le catalogue restent identiques. Zero pixel different hors
des deux zones de texte ; tous les autres calques sont inchanges. Les PSD
rouverts correspondent exactement aux PNG, et les deux codes-barres sont lus.

Apres publication : controles natifs repasses, 11 tests passes (typographie,
composants, regles et publication), preflights NieR et FF7 sans nouvel ajout.
La collection a ete reverifiee en navigateur isole a 1600, 390 et 360 px :
zero erreur JS/HTTP, aucun debordement horizontal. L'apercu et les captures
ont ete renouveles et inspectes. Barret et les autres cartes sont preserves.

La verification native supplementaire est archivee dans
`V4/collaborations/nier-pilot-01/verification/native-typography-recheck.json` ;
les preuves de publication originales restent associees aux cartes. Aucun
test d'impression physique n'a ete effectue.
