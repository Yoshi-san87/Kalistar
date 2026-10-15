# Kaylis : Katana vers Epee courte

Revision locale du 3 octobre 2026, explicitement demandee pour la version
Katana de Kaylis. Seule la creation `49055457`, **L'Elan des Couleurs**, change.
La version Dague `30000012` et les references approuvees sont conservees.

## Modification native

- Champ `weapon` : `Epée courte`, index 16 de la banque validee.
- Symbole blanc issu de `V4/atelier/designer-assets/packed/banks/return-weapon-16.png`.
- PSD edite via Photoshop, symbole importe comme objet dynamique embarque.
- Texte natif editable, illustration, statistiques, barcode et cadre preserves.
- 817 pixels modifies, tous a l'interieur du medaillon. Rayon maximal 38,67 px
  dans la zone autorisee de 47,5 px. Zero pixel modifie hors zone.
- Reouverture du PSD : rendu identique au PNG (zero difference).
- Barcode 49055457 relu en couleur et gris aux echelles 1 et 4. Pas de test
  d'impression physique.
- Les lignes Katana et Epee courte de la matrice actuelle sont identiques :
  le changement demande n'ajoute aucun avantage numerique de famille.

## Tracabilite

`before.json` et `originals/` preservent l'etat precedent. `staged/` conserve
les sorties natives. `verified.json` contient les comparaisons et le barcode.
`published.json` enregistre les hashes avant/apres des six fichiers publies
LOCALEMENT : card.psd/png, profile, creation, verification, catalogue.
`transaction.json` permet de suivre la publication verifiee/concurrente.

`revision.cjs` fournit prepare/native/verify/publish ; le rendu passe par
`render.ps1` / `native.jsx`. Ne pas relancer les etapes de publication pour
une simple verification, ni remplacer un ancien rapport pour cacher un ecart.
Les verrous et manifests proteges n'ont pas ete reecrits.

La nouvelle rapiere **La Promesse Blanche** requiert `characterId: kaylis`
et `families: ['Epée courte']`. Elle reste un overlay d'equipement, distinct
du petit symbole natif et sans changer la famille mecanique de son porteur.
