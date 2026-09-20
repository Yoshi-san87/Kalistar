# Kalistar V4 - Cristaux complementaires

Cinq cartes completent les quatre familles manquantes et le cas sans cristal. Avec Electro et la premiere serie, la galerie couvre les douze cristaux et NONE. Le maitre 04 existant est reutilise ; aucun nouveau PSD maitre duplique.

| Carte | Element | Profil |
|---|---|---|
| Kaylis | RAINBOW | `kaylis/card.json` |
| Elenion | GEO / Terre | `elenion/card.json` |
| Seraphina | HEMATO / Sang | `seraphina/card.json` |
| Valazar | NECRO | `valazar/card.json` |
| Malaba | NONE / Sans cristal | `malaba/card.json` |

GEO est distinct de MINERO / Roche. Les cinq illustrations sont reprises depuis leurs objets dynamiques V3, avec leur cadrage. Aucune regeneration de personnage. Les caracteristiques, identifiants, armes, races, factions et positions sont inchanges. Les corrections editoriales restent limitees aux profils V4 ; le recit de Malaba mentionne sa chope, conformement a l'illustration existante.

## Fichiers et structure

- PNG complets : `../../cartes/NOM_V4_01_ELEMENT.png`.
- PSD en calques : `../../templates/NOM_V4_01_ELEMENT.psd`.
- Maitre : `../KALISTAR_V4_TEMPLATE_04_ELEMENTS.psd`, 897 x 1497 px, 300 ppp, sRGB.
- Extension de registre : `../registry-elements-05.json`, avec reference au registre 04.
- Inventaire multi-elements : `../current-elements.json`, qui preserve la premiere serie.
- Galerie commune avec Electro : `../../galerie-elements.html`.

Les textes restent natifs. Illustration, drapeau, cristal, arme, race, fonds et effets sont separes. RAINBOW emploie des calques de transfert de degrade ecretes sur les objets dynamiques existants. Le tramage est desactive : Photoshop le recalcule a la reouverture et produisait de legeres differences de pixels. L'or nuance du support original reste la base des reflets.

NONE conserve un cristal sombre dans une enveloppe hexagonale calibree, avec des branches attenuees. Son profil interdit halos magiques et barrieres. Le symbole Death de Valazar utilise une ancre optique sur la masse visible, distincte du centre de son rectangle allonge.

## Production

1. Modifier uniquement le profil `nom/card.json` concerne.
2. Choisir les noms dans `render-config.json`.
3. Executer `V4/scripts/stable/render-elements-02.jsx` dans Photoshop. Le moteur commun `element-batch.jsx` sert aux deux series, sans duplication de la logique de composition.
4. Executer `verify-elements.cjs --batch elements-02`, puis `verify-barcode.py --card <profil>` pour chaque carte.
5. Executer `prove-elements-02.jsx`, puis `verify-elements-02-optical.cjs` : controle du contour Death, du centrage optique et de la stabilite d'une seconde calibration, ainsi que des calques Rainbow natifs.
6. Actualiser l'inventaire avec `finalize-elements-02.cjs`, puis verifier la galerie avec `verify-gallery.cjs`.

Ne pas relancer `prepare-elements-02.cjs` sur ce lot existant. Les profils editables sont la source du rendu ; les copies dans le manifeste ne sont que la provenance initiale. Ne jamais composer deux cartes en parallele dans Photoshop. `pause.request` arrete le lot a la prochaine frontiere de carte, sans abandonner un enregistrement en cours.

## Verification

`verification.json` compare les cadres fixes et les rendus PSD reouverts, controle les valeurs V3 et les limites des textes/drapeaux, puis verifie les empreintes des 81 sources protegees. Les codes-barres sont lus depuis les PNG reels, en couleur et en gris, a taille native et x4. `complete.json` n'est produit qu'apres les controles complets.

La galerie fait l'objet de controles statiques de syntaxe, chemins, couverture des cristaux et dimensionnement. L'ouverture automatisee des URL locales est bloquee par la politique du navigateur ; aucun test visuel navigateur n'est revendique. Les PNG sont inspectes directement.

Validation artistique finale reservee a l'utilisateur. Les codes-barres sont des identifiants de modele, pas une preuve de propriete. Les exports RGB ne constituent pas un BAT CMJN ; la lecture sur papier doit encore etre testee. La V3, le site, la BDD, les cinq Electro et la premiere serie de seize cartes restent intacts.
