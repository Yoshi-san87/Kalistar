# Balmhyr : sept moments illustres

Revision visuelle du Fragment, sans modification du roman, des rencontres,
des recompenses ni des donnees personnelles. Livraison : 4.6.114.

## Scenes

1. Horizon : Balmhyr comprend la trahison de Lok, face a lui au Conseil.
2. Durane : seul et prostré au crepuscule devant la limite magnetique.
3. Guide : il se confie a Kaylis dans sa maison d'exil, avant la liberation.
4. Portes : Madania ajuste le Gant de Fer qu'elle a garde pendant son absence.
5. Serment : assis au seuil, il reprend la hache sans ceder a sa colere.
6. Rempart : il tient le passage pour laisser Kaylis traverser avec les dossiers.
7. Empreinte : la dague de Lok heurte le Gant, Kaylis rompt la pression magnetique.

L'auteur a demande des poses et cadrages plus emotionnels et varies que le
portrait de carte. La scene de Madania a ete explicitement validee et reste
intacte. La conversation Kaylis a ete deplacee chez Balmhyr sur sa demande.
Le dernier tableau montre le combat en cours, pas Lok deja maitrise. Celui-ci
reste vivant dans le recit. Aucun nouveau couronnement ou destin n'est ajoute.

## Sources Et Livraison

- [Galerie des sept tableaux](index.html).
- [Prompts et references](prompts.json), generation integree, pas d'API payante.
- [Provenance et empreintes](art-provenance.json).
- [Preparation reproductible](prepare-art.cjs) : deux tailles WebP, sans
  recadrage ni retouche de la peinture choisie.

Sept sources PNG distinctes et preservees sous sources/. Les images natives
des cartes restent inchangées. La premiere proposition de finale reste en
sources/balmhyr-empreinte-v1.png ; seule la version de combat v2 est livree.
Une retouche precise a retire la deuxieme pointe parasite de la dague, sans
changer la composition, les personnages ou la lumiere de la bataille.

Les quatorze exports totalisent 3 357 804 octets. La plus grande scene pese
409 954 octets ; chaque version telephone reste sous 180 ko. Seule la scene
affichee charge : pas de prechargement des chapitres bonus caches, ni de
canvas, minuterie ou animation permanente ajoutee. Les couvertures restent
les peintures des cartes recompensees. Les PNG ne partent pas dans Git.
Sur telephone, le titre du livre reste accessible aux lecteurs d'ecran mais
ne se superpose plus aux visages de ces sept tableaux. Le personnage demeure
nomme dans la barre du lecteur et chaque chapitre garde son titre visible.

Les sources et exports ont une copie hors checkout, controlee par SHA-256 :
`C:/Users/guill/Documents/Sauvegardes-Kalistar/2026-10-22-balmhyr-scenes/`.

## Verification

Les tests sources et rendu vivent dans journey-covers.test.cjs et
journey-view.browser.test.cjs, sans nouveau runner ou liste concurrente.
Ils controlent les sept tableaux, leurs deux resolutions, les empreintes,
les URL versionnees, les bonus caches avant ACK, le clavier et Reduced Motion.
Les preuves repetables vont dans work/qa/balmhyr-scenes/.

- Tests medias et build cibles : 14/14 passes.
- Suite CI complete : 102 groupes passes. Deux controles optionnels restent
  desactives par leur configuration habituelle : comparaison statistique longue
  des adversaires et ancien test navigateur des reliques. Ce lot ne modifie
  ni les adversaires ni les reliques.
- Suite locale complete : 14 groupes passes, y compris les tests PostgreSQL
  ephemeres ; aucun compte ni combat personnel n'est utilise.
- Navigateur source : passe, 28 scenes Momo/Balmhyr PC et Razr, sept tailles
  d'ecran, clavier/tactile, trois revelations bonus et absence de boucle au repos.
- Relecture visuelle PC et Razr : rencontre chez Balmhyr, Madania inchangee,
  finale en action, titre mobile degage des visages.

Les premieres passes ont detecte les assertions de version et de medias du
build a actualiser, puis le controle de geometrie qui incluait le titre mobile
volontairement reserve aux lecteurs d'ecran. Les assertions explicites de
version, des quatorze images et de cette presentation mobile restent testees.

## Publication

Uniquement les quinze fichiers texte et registre termines de ce perimetre,
avec tag annote v4.6.114. Les propositions des autres chats et leurs sorties
QA restent hors livraison. Apres commit, prepare-release.cjs construit le
paquet fige depuis ce commit et les seuls medias controles. Il est soumis a
journey-view.browser.test.cjs puis deploy/browser.test.cjs avec KALISTAR_DIST.
Apres envoi au projet personnel kalistar, login.browser.test.cjs controle
l'acces prive public sur PC/Razr. Les journaux de ces controles et de l'envoi
restent dans work/balmhyr-scenes/, les captures dans work/qa/balmhyr-scenes/.
Aucun reset ni migration Supabase n'est necessaire.
