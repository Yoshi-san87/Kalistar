# Mes decks - contrat d'integration

Statut : API confirmee et branchee par le parent. 41 tests unitaires passent.
La verification navigateur de l'application integree appartient au parent.

Charger `deck-library.js`, puis `deck-builder.js`, avec `deck-builder.css` apres
les styles existants. Lucide local (`assets/lucide.min.js`) est reutilise.

```js
const builder = KalistarDeckBuilder.create({
  data, engine: E, registry: db.registry, userId: accountId,
  getDraft: () => ({ cards: deck, name: deckName }),
  onDraft: ({ cards, name }) => { /* persister les preferences du profil */ },
  onPlay: () => { /* ouvrir le choix de partie, sans demarrage automatique */ },
  onDetail: id => { /* detail de carte existant */ },
  toast,
  validateDeck: ids => strictValidator(ids) // optionnel, erreurs string[]
});
root.innerHTML = builder.render();
builder.mount(root);
// builder.refresh() : relire le brouillon parent et le registre.
// builder.destroy() : detacher les ecoutes avant changement de vue/profil.
```

`mount(root)` monte egalement le HTML : `render()` est facultatif. Les actions
utilisent exclusivement `data-deck-action`. Les callbacks recoivent des copies.
Une instance est liee a un userId immuable ; recreer au changement de profil.
Le parent reste proprietaire du routage, des preferences deck/deckName, des
details, de la BDD et du lancement de partie. Le module ne modifie aucune arene.

Les brouillons sortants contiennent toujours 10 slots, y compris les `null`.
Un ancien brouillon compact de 0 a 10 cartes est accepte et complete a droite.
Le parent peut compacter pour sa preference historique et pour le moteur.
`refresh()` reconnait cet echo compact et conserve les trous de l'instance.
Les entrees sauvegardees en bibliotheque conservent les trous apres rechargement.
Une preference compacte seule ne permet pas de reconstruire les anciens trous
apres creation d'une nouvelle instance : garder les null cote parent pour cette garantie.
Un brouillon incomplet peut etre
sauvegarde, jamais joue. Aucun nettoyage automatique des cartes non possedees.

Validation de jeu : `engine.validatePlayableDeck(ids)` et
`engine.deckCoverage(ids)` (repli strict local pour ancien moteur) + formation
P1-P5 + registre/pending + validateur strict fourni (contrat string[]).
Le registre existant doit fournir `owned(userId, cardId)` et
`deckErrors(userId, ids)`. Les sauvegardes ne constituent pas une preuve de
propriete : leurs droits sont recalcules a chaque affichage et au clic Jouer.

La bibliotheque pure UMD utilise un stockage injecte de type localStorage,
10 entrees maximum par cle `kalistar.v3.deckLibrary.<userId encode>`.
Elle ne touche pas les anciennes preferences, IndexedDB ou ownership.
Les operations JSON sont validees entierement avant une unique ecriture.

## Bibliotheque UMD

```js
const library = KalistarDeckLibrary.create({
  storage: localStorage, userId: accountId,
  knownIds: data.cards.map(c => c.id), crypto: window.crypto
});
library.list();                         // copies defensives
library.get(id);
library.save({ name, cards });           // nouvelle entree, 10 slots exacts
library.save({ id, name, cards });       // remplacer cette entree uniquement
library.duplicate(id, optionalName);
library.remove(id);
library.validateDraft({ name, cards });  // ne stocke rien
library.exportJSON();
library.importJSON(json);               // fusion atomique, collisions refusees
library.importJSON(json, { mode: 'replace' }); // remplacement explicite
```

Noms : 1-50 caracteres, blancs exterieurs retires, controles refuses.
IDs : UUID v4 issus de crypto.randomUUID ; aucune source aleatoire faible.
Cartes : chaines 30000001-30000041 presentes dans knownIds, ou null.
Un brouillon peut depasser les limites de jeu et rester sauvegardable : celles-ci
ne deviennent jamais une autorisation de propriete ou de jouer.
Les JSON corrompus, schemas/editions inconnus, collisions et quotas refuses
ne sont jamais remplaces silencieusement. Une mutation valide ecrit une seule
valeur JSON ; relecture avant commit avec refus si la valeur a change. Ce n'est
pas un verrou transactionnel inter-onglets.

## UI Et Cycle De Vie

- `mount(root)` remplace le contenu de root, installe les ecoutes locales et les
  icones Lucide dans cette racine uniquement. Appeler `destroy()` avant de changer
  de racine ou de vue ; remonter la meme instance conserve la selection et les trous.
- `refresh()` relit getDraft et les droits. Il ne declenche pas onDraft/onPlay.
- `inspect()` renvoie une copie du brouillon, selectedId, targetSlot et l'etat
  de validation (coverage, missing, formation, errors, playable).
- `onDraft` est synchrone ; `onPlay` peut renvoyer une Promise, le bouton est alors
  bloque jusqu'a resolution. Aucun appel a newGame, setArena ou autoplay.
- `storage`, `crypto` et `validateDeck` sont des injections optionnelles de test.
- Les edits non sauvegardes d'une entree sont conserves en memoire pendant les
  changements de selection. En quittant le profil, recreer l'instance.
- La suppression est confirmee en ligne ; la composition reste en brouillon.
- L'import UI fusionne uniquement, sans ecraser les entrees existantes.

## Affinites Et Mise En Page

Les groupes donnent leur nombre dans le deck et un plafond calcule par
engine.synergy sur un plateau synthetique limite a cinq unites. Il ne s'agit ni
d'une formation garantie de ce groupe, ni d'un bonus actif sur les dix cartes.
Le delta candidat compare son groupe avant/apres remplacement du slot vise ;
les membres partages excluent la carte remplacee. Un sixieme membre ne produit
aucun gain fictif. Les pertes de couverture sont signalees dans l'apercu.

Le ratio 797/1388 est confirme sur les 41 full PNG locaux. Page max 1920 px ;
slots 5 colonnes et 2 lignes, largeur adaptee a la hauteur disponible sur grand
ecran. L'aside couvre les lignes Composition et Candidates de la meme grille,
afin que son contenu sticky accompagne la consultation des candidates.
Pagination adaptee a la largeur du catalogue : 4 / 6 / 8 candidates, deux
rangees. Sur mobile : cinq colonnes pour les slots, deux pour les candidates,
apercu dans le flux sans popup ni zone de defilement interne.
