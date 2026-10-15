# Nouvelles propositions et Kaylis

Sept illustrations. Kaylis et Edris-7F sont validees pour leurs cartes natives dans
`../../expansions/2026-10-14-kaylis-edris/`. Les cinq autres restent en attente.
Aucune regle de combat modifiee.

Ouvrir `index.html` directement : aucune installation ni serveur necessaire. Chaque illustration donne acces au PNG original. Les six anciennes propositions restent disponibles.

## Sources
- `selection.json` : etat courant, chemins, noms et provenance des sept sorties.
- `prompts.json` : demandes exactes des six nouvelles compositions et references de style/identite. Les champs de l'ancienne proposition restent des archives de travail ; seul selection.json decrit la selection actuelle.
- `kaylis.prompt.json` : demande exacte de Kaylis et ancrage narratif.
- `kaylis-v2.prompt.json` : retouche de la cape noire a motifs rouges et alignement rectiligne des deux rapieres ; version precedente conservee.
- `card-final-edits.json` : axe de Promesse rectifie et nouvelle scene d'infiltration d'Edris-7F avec sa coiffure precedente.
- `kaylis-v4.prompt.json` : miroir horizontal et retrait de la bande bleue pendante ; image finale `07-kaylis-04.png`.
- Generation : outil image_gen integre. Copies des sorties originales sans retouche ni recadrage.
- References Kalistar : Momo / Valazar, anciennes propositions pour l'identite ; illustrations existantes de Kaylis et Promesse Blanche pour sa variante.

Kaylis s'inspire du chapitre XIII, paragraphe 64 (index zero) de `V4/site/story-content.json` : depart de chez Madania, a Durane. Cape, tresses et seconde rapiere sont des ajouts visuels demandes par le joueur, pas des details deja inscrits dans ce passage.

Les cinq propositions non retenues n'ont pas de gameplay publie. Kaylis et
Edris-7F occupent P2/P3 ; leurs valeurs definitives sont dans le dossier des cartes.

## Verification
`node qa/check.cjs <chemin-absolu-vers-node_modules>`
Controle les copies PNG, les sept images, leurs liens, la police, les filtres et l'absence de debordement aux largeurs 1440, 412 et 320 pixels.
