# Royal Training - contrat de production

Etat : architecture et controles hors Photoshop. Aucune publication autorisee.

## Entrees

- `profiles-a.json` : 4 cartes (Erdos).
- `profiles-b.json` : 5 cartes (Curie).
- Tableau JSON de profils plats : `key`, `name`, `title`, `job`, `description`,
  `element`, `race`, `weapon`, `faction`, `positions`, `role`, `atk`, `defense`,
  `magic`, `barriers`, `characterId`, `art`, `crop`.
- `key` stable, ASCII minuscule avec tirets. `art` PNG relatif au lot, dans
  `art-a/` ou `art-b/`. Crop explicite `{zoom:1,x:0,y:0}` par defaut.
- `atk` et `defense` : six faces D6 vers D1. `magic` et `barriers` : numeros des
  des, seulement sur des valeurs numeriques. Valeurs dans les plafonds du role.
- Effets ATK : retry, mana, guard, revive, buff_atk, death ; DEF : retry, dodge.
  Guard seulement roles 1/5, revive seulement role 5. NONE sans modes magiques.
- `role` appartient aux positions, triees sans doublon. Pas de role deduit
  silencieusement. Meme characterId entre editions d'un personnage.
- Nom <=30, titre <=40, metier <=22, description <=240 caracteres. Viser
  150-190 caracteres pour quatre lignes confortables ; le controle natif reste
  souverain. Ne pas reduire la police canonique pour faire tenir un recit.
- Pas d'ID manuel : 4 + sept chiffres derives de SHA256(lot + ':' + key),
  controle de collision avec tout le catalogue et les autres cartes du lot.

## Decisions explicites

- Toutes les neuf cartes sont des creations V4, aucun nouvel original canonique.
- Aelis `aelis-veille` : nouvelle edition de la scene V2 `00000017`, titre et
  art historiques, P3/P5, characterId aelis. Reequilibrage utilisateur approuve
  le 24 septembre : role 5, Reraise, valeurs dans les bornes V4. Aucune exception
  aux regles actuelles. Cette edition ne remplace pas Aelis deja publiee.
- Kaylis : characterId kaylis, RAINBOW, Katana, P1/P2/P3.
- Baptiste : VAMP, Instrument, P3. Sapphire : SIRENA, Poing, P1.

## Revisions visuelles uniquement

1. Kaine 45951088 et Capitaine Skully 30000035 : proposition de zoom +12 %,
   verification des armes et du visage ; +15 % uniquement si le cadrage tient.
2. Darnako 30000004, Xiaomi 30000027, Ruby 30000039 : nouvelles illustrations
   parent dans retouches/darnako.png, xiaomi.png, ruby.png.
3. Solaria : retirer le parasite sous la pointe, sans deformation du drapeau,
   ni changement de sa barre ou ombre. Aelis et Iliane existantes, Aelis nouvelle
   et nouvel Aurelion doivent partager le composant corrige.

Identites, textes, caracteristiques, positions et modes des sept cartes
existantes restent identiques. Tous les anciens PSD/PNG/profils/sources et
rapports sont conserves avant une revision explicite. Aucune source V3 modifiee.

## Preuves et transaction

- Base actuelle annoncee : 80 cartes, 38 references, 42 creations, 23 arenes.
  Verifier les fichiers reels ; resultat vise 89 / 38 / 51 / 23.
- Capturer le verrou actuel, les manifests, la liste des creations et toutes
  les dependances utilisees. Reviser seulement une liste explicite de cibles.
- Chaque preparation lie son profil normalise et ses sources propres ; une
  revision d'art d'une carte n'invalide pas les autres sans raison.
- Toute modification apres preparation archive la preparation et les rendus
  dans une tentative nommee. Pas de reecriture d'anciennes empreintes.
- Reutiliser les composants et le JSX natif stables. Typographie mesuree pour
  les noms accentues, sans modifier les fontes, tailles, centrages ou tolerances.
- Controle PNG/PSD 897x1497, 300 ppp, textes editables, composants dynamiques,
  decode CODE128, reouverture PSD pixel-identique, pixels hors regions autorisees.
- Regression native des 38 references et preuves copiees dans ce lot suivi,
  jamais de rapport requis uniquement sous atelier/data/jobs (ignore Git).
- Publication transactionnelle separee, apres revue parent : sauvegardes,
  hashes source/cible, journal et recu recuperable apres commit. Nouveau verrou
  enfant motive pour les references revisees, jamais un freeze global.

## Sequencement et proprietes

Maintenant : audit Solaria, apercus zoom hors production, schema/tests/capture.
Apres profils et arts finis : preparation explicite et controle des textes.
Apres feu vert Photoshop : un proprietaire du mutex, pilotes puis serie,
verification/reouverture et regression. Fermer uniquement les documents du lot.
Apres validation parent : publication par parent, puis QA site et Git par parent.

Ce worker n'edite pas art-a, art-b, retouches, prompts/notes parent, ancien lot,
ni le site partage. Pour Solaria, fournir asset V4 et contrat de surcharge au
parent pour le site/deploiement ; ne pas modifier V3/assets/factions/Solaria.png.
