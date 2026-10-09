# Batman et Joker - cartes natives

Deux illustrations fournies par l'utilisateur, sans retouche ni regeneration.
Les originaux et leurs empreintes sont dans `input-provenance.json`.
Publication additive : 304 vers 306 cartes, collection Batman de 8 a 10.

## Profils

| Carte | Identite stable | Positions | Role | Famille | Particularites |
| --- | --- | --- | --- | --- | --- |
| BATMAN 49901509 | batman-batman | P1/P2 | Tank | Projectile | Garde ATK4, Retry ATK2, Esquive DEF3 |
| JOKER 49901510 | joker-batman | P3/P4 | Middle | Baton | Mort ATK4, Retry ATK2, Esquive DEF2 |

Tous deux sont HUMAIN, sans cristal : pas de magie ni de barriere.
Batman privilegie la defense (203/289 au D6), l'aide aux allies et l'esquive.
Le Joker est plus offensif (228/216 au D6), avec une face Mort et une face
Retry qui expriment son imprevisibilite sans nouvelle mecanique.
`set.json` conserve les faces de D6 a D1. Aucune matrice ni regle modifiee.
Les dix cartes Gotham peuvent couvrir chaque position deux fois ; aucun
preset ni aucune composition personnelle n'est remplace.

## Banniere non livree

La demande de remplacer la tour gothique par le logo Batman reste non realisee.
L'outil image a refuse la generation, puis l'adaptation du logo fourni
`BatmanLogo36.jpg`. Les deux requetes et les erreurs exactes sont conservees
dans `input-provenance.json`. Aucune autre voie de generation n'a ete tentee.
L'utilisateur a ete informe. La banniere noire et or precedemment validee,
avec sa tour gothique, est conservee sur les dix cartes et dans le site.
Le logo fourni est archive comme source, mais n'est pas utilise dans les
exports ni dans le site. Ne pas annoncer cette adaptation comme terminee.

## Production et preuves

- Template natif 897 x 1497, 300 ppp ; textes editables et objets incorpores.
- Photoshop 26.11.8, guillemets automatiques desactives pendant le rendu.
- `before.json` fige les sources avant rendu ; il n'est jamais reecrit.
- `native-checks.json` : zero difference de cadre, zero difference apres
  reouverture des PSD, deux codes-barres verifies.
- Images et petites cartes inspectees ; descriptions sur quatre lignes.
- Les 304 entrees anterieures sont conservees exactement.
- Six tests d'integration : identites, limites de roles, deck complet,
  12 faces ATK, 12 faces DEF, 32 matchs ABBA complets avec restaurations.
- 14 scenarios IndexedDB isoles : anciens backups, exemplaires, transferts,
  conflits, matchs et connexions anciennes. Aucun profil utilisateur touche.
- `browser-proof/` : les deux fiches a 1440 x 1000, 412 x 915 et 320 x 740 ;
  duel Batman/Joker desktop et mobile, puis reprise apres reload.
  Aucun debordement horizontal, erreur JavaScript ou ressource en echec.

## Verification

```powershell
node --test V4/expansions/2026-10-09-gotham-completion/integration.test.cjs
node --test V4/expansions/2026-10-09-gotham-completion/persistence.test.cjs
node V4/deploy/build.cjs
node V4/expansions/2026-10-09-gotham-completion/browser.test.cjs
```

Le test navigateur utilise un contexte temporaire et un serveur ephemere.
`KALISTAR_PAGES_URL` permet le meme controle sur la publication publique,
avec des preuves separees dans `public-browser-proof/`.
Les tests natifs d'integration sont ajoutes au workflow Pages avec les
sources de preuve LFS requises. Il ne s'agit pas d'une mesure de taux de victoire.
