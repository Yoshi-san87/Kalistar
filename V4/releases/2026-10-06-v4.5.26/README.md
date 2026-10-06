# Kalistar 4.5.26 - Morveth

Ajout du quatrieme soldat de Cryptown, approuve le 6 octobre 2026.
Morveth - Ceux qui rentrent encore, modele 49900603, P2 uniquement.
SKULLZ, NECRO, SOLDAT, Faucille ; fusil illustre dans le dos, sans seconde
famille d'arme ni attaque supplementaire. Mort sur ATK D1 demande par l'utilisateur.

L'illustration validee est conservee a l'identique. PSD natif avec textes
editables, PNG 897 x 1497, aucune modification du cadre ni des anciens profils.
Cadre fixe : 0 pixel different. PSD rouvert : 0 pixel different. Code-barres lu.
215 cartes jouables. Version desktop, mobile et assertions avancees ensemble.

## Verification

Huit tests cibles couvrent profil et bornes P2, illustration, synergies,
Mort contre defense/Esquive/Reraise, relance Kalistel et 24 matchs complets
avec reprise de sauvegarde et presence dans chacun des deux camps.
Captures et controles PC 1440 x 1000, telephone 412 x 915 dans le lot natif.
La release est verifiee depuis l'instantane Git indexe, sans embarquer les
autres travaux locaux. Les rapports de workflow et navigateur sont conserves ici.

Toutes les commandes du workflow passent : 215 tests automatises, plus les
scripts Kalistel et ambiance. L'instantane teste est
d230d782a7ee05e455352aa7cc762527abfd064d. Les tests des trois armes de Cryptown
incluent maintenant Morveth : bonus numeriques, disparition a l'inactivation,
compatibilite de faction et absence de bonus numerique sur Mort.

## Publication

Depot autorise : Yoshi-san87/Kalistar. Branche main et tag annote v4.5.26.
Le workflow Pages doit reussir puis public-check.cjs doit confirmer la version,
le catalogue, la position P2, Mort D1 et le hash exact du PNG public avant
d'annoncer la mise en ligne. Ces controles ne sont pas simules par ce document.
