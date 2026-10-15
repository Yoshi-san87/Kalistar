# Registre des statistiques

Demande du 10 octobre 2026 : appliquer la DA actuelle de Kalistar au classement
de carriere, avec une lecture confortable sur ordinateur et smartphone.

## Presentation

- Embleme Statistiques existant, texture grimoire, cuivre et accents cyan du
  socle partage. Titres Cinzel, chiffres tabulaires et contraste des lignes.
- Tableau pleine largeur sur PC, en-tetes et identites fixes pendant le
  defilement. Portraits tires des illustrations natives, sans nouveau fichier
  de personnage ni transformation des sources protegees.
- Tri par selecteur ou en-tete, sens explicite, colonne triee mise en evidence.
  Sur petit ecran, cette colonne passe devant les autres metriques pour rester
  visible a cote du personnage. L'ordre des colonnes CSV reste inchange.
- Trophees illustres avec leur nom Golden complet. Aucun faux premier pour
  une valeur absente ou nulle. Les regles de classement restent inchangees.
- Filtres repliables, confirmation de fermeture, Escape et clic exterieur sur
  telephone. Commandes regroupees dans l'en-tete en portrait; paysage compact.
- Etats vides et indisponibles, export des lignes filtrees, ouverture des fiches,
  focus clavier et Reduced Motion preserves.

## Perimetre

`statistics.js` ne change que le rendu et les interactions. `rows`, `value`,
`metricTitle`, `sorted`, `csv`, les coefficients et les sources restent les
memes. Aucune ecriture de match, equipement, collection ou sauvegarde.
`statistics-skin.css` est charge apres le socle d'interface et ne cible pas le
palmares partage par l'ancien `statistics.css`.

Les ecouteurs de changement de largeur, clavier et pointeur sont detruits par
le meme AbortController que la vue. Aucun canvas, timer ou boucle d'animation.

## Verification

```powershell
node --test V4/site/statistics.test.cjs V4/site/statistics-skin.test.cjs V4/site/collaborations.test.cjs V4/site/ui-system.test.cjs
node V4/site/statistics-skin.browser.test.cjs
node --test V4/deploy/build.test.cjs
node V4/deploy/build.cjs
$env:KALISTAR_BUILT_SITE='1'
node V4/site/statistics-skin.browser.test.cjs
```

Le test navigateur utilise huit vrais matchs moteur dans une base isolee.
Il couvre PC 1440/1920, tablette 800, Razr 412, compact 320, paysage 844 et
Reduced Motion 390 : filtres, tris, valeurs exactes, noms de trophees, export,
fiche personnage, fermeture clavier, defilement et invariance des archives.
Captures et rapport dans `qa/local/` et `qa/built/` (sorties QA ignorees).
