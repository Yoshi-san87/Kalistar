# Pascal - livre reconstruit

23 septembre 2026. L'utilisateur a rejete la geometrie du livre de la premiere
retouche : la couverture formait une paroi verticale sous les pages.

Le livre entier a ete regenere dans l'illustration source avec l'outil imagegen
integre, en conservant Pascal, son eleve et leur scene. Il est maintenant ouvert
presque a plat ; les deux plats fins suivent les pages, la tranche reste mince,
la gouttiere centrale est continue et la main soutient le volume par-dessous.
La carte complete a ete inspectee visuellement apres integration native.

- Profil, catalogue, statistiques, effets, positions et textes inchanges.
- Seul l'objet dynamique d'illustration remplace dans une copie du PSD courant.
- Zero difference hors illustration et avec l'illustration masquee.
- Rendu du PSD rouvert identique au PNG ; code-barres effectivement decode.
- Cinq tests cibles passes ; 22 tests de catalogue, arenes et build passes.
- Deux vues navigateur isolees controlees : 1600 et 390 px. Media servi identique
  au fichier publie par SHA-256, aucune erreur JS/HTTP ni debordement de viewport.
- Build du jeu en ligne reussi : 57 cartes, 303 fichiers jouables.
- Publication de 15 fichiers tracee dans transaction.json ; originaux conserves.
- Photoshop ferme apres sauvegarde.

Prompts et references : [art-provenance.json](art-provenance.json).
Carte : [work/pascal/card.png](work/pascal/card.png).
Preuves : verified.json et browser-review/report.json.

La premiere retouche reste archivee avec ses preuves d'origine ; sa verification
technique ne constituait pas une validation de la geometrie du livre. La preuve
active de Pascal est celle de cette revision.
