# Fragments : equipements de Kaylis

Deux objets compatibles avec la version 49055457 completent son parcours :

- Bottes du Prochain Pas : protection, +20 DEF sur le six conserve.
- Ruban des Couleurs : relique, une fois par match apres une attaque ennemie
  survecue en inferiorite numerique, arme +40 ATK pour sa prochaine attaque
  numerique conservee. Les regles existantes d'ultime restent inchangees.
  Une Mort evitee ou un Reraise peut donc preparer cette charge ; un soutien
  ne la prepare pas et une attaque speciale ne la consomme pas.

Les sept autres recompenses utilisent des objets deja publies. Aucun moteur,
cadre de personnage ou fichier natif valide n'a ete modifie.

## Sources et export

Six images generees independamment : objet, scene et anneau pour chacun.
Les prompts et les chemins sources exacts figurent dans
`../../weapon-cards/fragment-prompts-2026-10-21.json`. Les PNG restent dans
`../../weapon-cards/sources/` et sont sauvegardes hors checkout avant publication.
`build-assets.cjs` produit uniquement les huit WebP de ce lot ; pas de rebuild
des autres objets. Le manifeste `media-provenance.json` fixe les SHA-256 des
sources et exports, le centre optique 244/242 et la transparence des medaillons.

La presentation utilise les cartes HTML existantes et des anneaux independants.
Les tests `site/weapon-art.test.cjs` verifient la provenance, le centre libre et
le corps contenu dans l'anneau. Le registre runtime ne contient que huit ajouts.

## Compatibilite

L'ajout de donnees dans weapons.js change l'empreinte runtime. La compatibilite
avec 4.6.103 est justifiee par reconstruction : retirer le bloc explicitement
additif redonne exactement les octets precedents et leur empreinte runtime.
`deploy/journey-compatibility.test.cjs` controle cette preuve et conserve les
signatures des snapshots existants ; aucun hash inconnu n'est accepte.

Voir `../../docs/PARCOURS_BIBLIOTHEQUE.md` pour les regles serveur et les recits.
