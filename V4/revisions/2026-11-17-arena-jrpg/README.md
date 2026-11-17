# Combat JRPG - sons et impulsion

Revision demandee apres 4.7.30 : remplacer les sons trop doux par des attaques
JRPG avec du poids, rendre l'action centrale evidente et garder la penombre
du duel jusqu'au clic Tour suivant.

## Sources sonores

17 effets originaux generes dans le Runway personnel de l'auteur : cinq
textures de combat et douze impacts elementaires. Autorisation initiale de
35 credits, 34 utilises (17 x 2 secondes), sans achat. L'autorisation ulterieure
d'aller plus loin n'a pas ete necessaire. Aucun son commercial copie.

Les prompts et identifiants sont dans generation.json ; aucun lien signe ou
jeton de telechargement dans Git. Les originaux sont sauvegardes hors checkout
sous `sauvegardes-personnelles/audio/2026-11-17-arena-jrpg/source/`.
Les exports ont leur copie dans `exports/` au meme emplacement prive.

`prepare-sounds.cjs` utilise FFmpeg pour aligner l'attaque du son, enlever
l'infra-grave inutile, maitriser la dynamique, raccourcir a 1,35 seconde et
limiter les pics avant encodage mono 44,1 kHz / 128 kbit/s. exports.json garde
les empreintes originales et finales, le decalage, la duree, le niveau RMS et
le pic reel apres decodage MP3. Ensemble web : 384 404 octets pour 17 effets.

## Integration

`arena-audio.js` lit ces echantillons a faible latence. Cache fixe de 17 sons,
quatre voix maximum, compresseur de sortie et volume utilisateur conserve.
Le volume par defaut passe a 30 % uniquement quand aucun reglage personnel
n'existe. Un telechargement ou decodage lent ne bloque jamais une commande et
ne declenche pas de son tardif. Rien ne charge avant Entrer ou sans activation.
Les textures des cartes visibles sont preparees au premier geste en arene.
Les sources terminees se deconnectent ; le contexte est suspendu au repos.

La charge precede le jet. Les impacts elementaires partent au contact visuel,
avec un accent distinct pour le blocage, l'esquive ou l'elimination. Une
esquive ne produit pas un faux bruit d'impact. Les courtes queues sonores
terminees ne sont pas coupees par le simple rafraichissement du resultat.

Le bouton garde sa geometrie. Deux trainees cuivre/cristal parcourent une
bordure masquee de 3 px ; une impulsion et le sceau animent uniquement opacite
et transformation. Rien ne traverse le texte. Les controles indisponibles,
popups, presentations et Reduced Motion desactivent ces appels visuels.
Le resultat conserve le meme halo sombre jusqu'au passage au tour suivant.
