# Nettoyage Kalistar termine

Lot exact confirme par l'utilisateur, execute le 17 septembre 2026.

- **5,23 Go liberes** : 742 fichiers supprimes definitivement.
- Dossier passe de **10,35 Go a 5,12 Go**, hors petits fichiers de cet audit.
- 4107 fichiers conserves verifies par SHA-256 apres suppression : aucune modification detectee.
- Controle final : 4102 fichiers toujours identiques ; seuls les cinq documents administratifs ont ensuite ete mis a jour pour indiquer que le nettoyage est termine.

## Conserves

Les 41 cartes V3 avec leurs PSD, PNG, TIFF et ressources du jeu ; les cinq cartes V4 actuelles avec leurs PSD et PNG ; le maitre V4 03F, son registre et les profils ; les illustrations, sources graphiques et propositions ; les donnees, scripts, sites, fichiers Word et Excel. Les 224 chemins de ressources courantes controles sont tous presents.

## Supprimes

Anciens PSD de cartes exportes V1/V2, PSD intermediaires V4 remplaces, anciens exports d'impression et rendus de verification selectionnes. Types : 69 PSD, 466 PNG, 167 JPG, 36 TIF et 4 PDF. Les anciennes cartes PNG sont conservees.

Les rapports historiques peuvent citer des fichiers retires. Pour les prochaines cartes, utiliser [current.json](../../V4/template-stable/current.json) et le maitre 03F ; ne pas relancer la chaine des migrations historiques. Les anciens exports V1/V2 necessitent leur regeneration pour leurs controles historiques.

## Tracabilite

- [Selection approuvee](selection.csv) et [manifeste original](plan.json), inchanges.
- [Journal des suppressions](deleted-files.json).
- [Verification apres suppression](verification.json).
- [Mises a jour documentaires posteriores](post-cleanup-document-updates.json).
- [Statut final et controle des ressources](status.json).

Aucun test de gameplay ni nouveau rendu Photoshop n'a ete execute : le controle porte sur la presence et l'integrite des fichiers conserves.
