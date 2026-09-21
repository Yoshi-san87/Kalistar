# FF8 Squall : gunblade agrandie

Revision d'illustration seule de Squall. Le parent fournit `art/squall.png`
et conserve la direction artistique : pose epee sur l'epaule, personnage
en pied. Aucun changement de profil, ID, statistiques, texte ou cadre.

Copie du helper teste `../2026-09-21-ff8-details/` : seuls REVISION, KEYS
et le message d'image manquante changent dans `revise.cjs`.
`replace.jsx` est identique. Ni les scripts de la revision precedente ni
ses entrees figees ne sont modifies.

## Ordre d'execution

Attendre la fin de la publication des cinq cartes precedentes avant ce
`prepare` : il doit sauvegarder et proteger leur nouvel etat publie.
Ne jamais liberer le verrou de leur rendu actif.

Depuis la racine Kalistar :

```powershell
node V4/revisions/2026-09-21-ff8-squall-sword/revise.cjs
node V4/revisions/2026-09-21-ff8-squall-sword/revise.cjs prepare
node V4/revisions/2026-09-21-ff8-squall-sword/revise.cjs render
node V4/revisions/2026-09-21-ff8-squall-sword/revise.cjs verify
# Inspecter work/squall/card.png avant la publication explicite.
node V4/revisions/2026-09-21-ff8-squall-sword/revise.cjs publish
node V4/collaborations/ff8-set-01/publish.cjs
```

Sans argument : inventaire en lecture seule. `prepare` fige les entrees et
sauvegarde les originaux ; ne plus modifier l'art ou les scripts ensuite.
Seul `render` lance Photoshop. Les trois premieres etapes explicites ne
modifient pas la production.

Memes preuves : identite exacte sans art et hors rectangle d'illustration,
calques/textes/geometrie conserves, ancien PNG conforme au PSD original,
reouverture PSD identique, composants et code-barres verifies.
Memes sauvegardes, verrou exclusif, staging, journal et rollback.

La publication synchronise uniquement Squall dans le dossier de production
FF8 et dans creations, avec medias, preuves, preparation et hashes de creation.
Le catalogue, les profils, UUID et les onze autres FF8 restent intacts.
Le preflight reutilise toujours les douze cartes : ce n'est pas un nouveau set.

```powershell
node V4/revisions/2026-09-21-ff8-squall-sword/revise.cjs rollback
```

En cas d'echec d'installation, restauration automatique des octets sauvegardes.
Apres interruption, utiliser le journal et `rollback` ; les changements
independants ulterieurs ne sont jamais ecrases automatiquement.
Un second `publish` est idempotent. Aucun dossier existant n'est supprime.
