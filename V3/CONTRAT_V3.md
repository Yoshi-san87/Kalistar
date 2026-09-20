# Contrat de production V3

Travail dans ce meme projet, exclusivement sous V3. V2 et les sources main restent intacts.

## Donnees communes
- 41 cartes, 40 personnages : MOMO seul a deux versions. IDs V3 de 30000001 a 30000041. Noms/slugs et profils fournis par le chantier repertoire.
- Conserver les 15 personnages distincts V2, les deux Momo ; remplacer les versions dupliquees des autres personnages par de nouvelles identites. Ajouter les scenes Kaylis, Julienne, Lanio, Malaba (Baba), Gen.
- Profils : structure V2 + characterId stable (nom normalise), role principal 1..5, sentry boolean, canGuard boolean, canHeal boolean, source/story_scene/prompt pour provenance.
- element NONE = sans cristal ; couleur 93AAA5, hue 160, label SANS CRISTAL. Aucun halo ni barriere elementaire. Gen atelier avant fusion peut etre NONE ; Kaylis echappee conserve Rainbow si son pouvoir est deja eveille dans cette scene selon le recit. Lanio et Malaba avant fusion sont NONE.
- Images illustrations : V3/assets/illustrations/<slug>.png. Les images de base reprise V2 doivent etre copiees dans V3 et leur chemin mis a jour.
- Arenes : V3/donnees/arenes.json, tableau {id,name,subtitle,image,element,elementBonus,homeCharacters,homeAttack,homeDefense,source}. image = assets/arenas/<id>.webp (relatif au site). Une par cristal (12) + z13 + trone-fer + astraball ; une neutre ruins possible pour tests. homeCharacters contient des characterId et non des versions.

## Regles V3
- Carte avec cristal classique contre NONE : +20 ATK. Rainbow contre NONE : +30 ATK. NONE contre cristal : 0. Cycles et matrice armes restent identiques. Rainbow contre classique : +40 / retour classique -40 comme V2.
- Shield en ATK : valeur guard, phase guard, trait ward=60 ; choix d'un allie vivant du plateau, auteur compris. Seuls profils canGuard=true (P1 et quelques P5) portent cette face. Aucun shield special en DEF dans les 41 profils.
- ward ajoute +60 DEF sur la prochaine defense numerique face a une ATK physique, puis est consomme une seule fois. Une attaque magique, une esquive ou Mort ne consomment pas ward. Mort contourne ward. Une fois utilise sur un premier jet numerique, garder ce bonus dans le duel en cas de relance pour ne pas le consommer deux fois. Cumul avec les autres categories autorise ; une seule charge par categorie.
- Ordre automatique en defense : ward dans le score DEF, puis trefle en cas de score insuffisant, puis Reraise si la seconde chance echoue. Magie contourne ward ; Mort contourne ward et trefle mais pas Reraise.
- Buff physique ATK : valeur buff_atk, phase physical, E.grantPhysical(state,uid) et E.aiPhysicalChoice(state). Choix d'un allie vivant du plateau, auteur compris, exactement comme la potion magique. physical=60 sur sa prochaine attaque numerique physique. Les deux potions et les trois protections coexistent sans doublon de categorie.
- Reraise reserve aux profils canHeal=true, obligatoirement P5. Potion, trefle et autres capacites suivent logique des postes / Capacite Base du classeur.
- API moteur : E.grantGuard(state,uid), E.aiGuardChoice(state), E.arenaBonuses(state,unit) => {attack,defense,element,homeAttack,homeDefense}; E.setArena(state,id), autorise seulement setup. Ajouter champ formula.arenaAttack, formula.arenaDefense, formula.ward ; conserver les champs V2.
- Arenes : +15 ATK si cristal de la carte correspond au lieu ; affinite de personnage +10 ATK/+10 DEF. Maximum +25 ATK / +10 DEF. Symetrique pour les deux camps, aucun effet sur les faces non numeriques. Choix de lieu verrouille apres debut du match.
- V3 partie schema 6, namespace localStorage kalistar.v3., DB kalistar-v3-cards, instances K3-<id>-001. Ne pas reutiliser ni ecraser les statistiques V2, dont les regles et profils different. Import V2 non silencieux ; refuser les parties V2 dans la V3 avec message explicite.

## Design et sorties
- Impression 897 x 1497, 300 ppp : taille et zone noire preservees. Site utilise des PNG 797 x 1388 et leurs miniatures WebP, recadres au cadre sans marge noire d'impression (origine 50,50).
- Bande titre de version a redessiner sans croisement confus avec les ronds arme/race ; texte centre et harmonisation typographique.
- Armes : 20 categories originales de base, mecaniques et indexes V2 conserves, PNG transparents dans assets/armes/00.png a 19.png.
- Effets retry sans tige, revive visuellement centre, guard nouveau bouclier physique et cristal NONE desactive. PNG transparents dans assets/effets/ et assets/cristaux/.
- Site autonome par index.html, assets V3 seulement, aucune dependance a V2. Ne pas modifier cartes d'impression depuis le chantier site.
- DA illustration conservee depuis Momo : peinture fantasy narrative, emotions, poses et cadrages varies, anatomie lisible. Metamorphes humanoides avec deux bras et deux jambes ; tete animale, details/extremites et ailes possibles. Eviter les corps animaux quadrupedes et les membres dupliques.
