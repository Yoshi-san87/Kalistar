# Kalistar 4.6.75 - Acces prive

## Parcours

Le site Cloudflare exige desormais email et mot de passe avant d'ouvrir le jeu.
Deux comptes personnels, crees directement par leur titulaire, sont autorises.
Les inscriptions publiques et anonymes sont fermees. La session est conservee ;
le bouton Compte donne acces au registre et a la deconnexion.

L'autorisation serveur choisit le profil local Paris ou Tokyo. Les anciennes
sauvegardes, possessions, compositions et parties restent sur leur appareil,
sans reset ni synchronisation automatique. Le developpement local est preserve.

## Protection

Le Worker Pages verifie Supabase Auth et la liste privee des joueurs avant de
signer un cookie HttpOnly/Secure de quinze minutes, renouvele en jeu visible.
Les routes du jeu, catalogue, scripts et cartes brutes sont protegees ; seul
le login et ses assets minimaux sont publics. Les deux alias login Cloudflare,
avec et sans extension HTML, sont pris en charge.

Migration additive 003 appliquee : UUID Auth et empreinte d'email, RLS et fonctions
du registre controles cote serveur. Aucun privilege administrateur joueur ni
exemplaire reel attribue. Aucun mot de passe, token ou secret serveur dans Git.
Un cookie deja emis expire au plus quinze minutes apres une revocation ; le
registre applique la revocation immediatement. Aucun rappel des fichiers deja
telecharges n'est possible.

## Verification

- Suites CI et locale avec medias originaux, permissions PostgreSQL ephemeres.
- Parcours isoles avec le vrai Worker et le SDK officiel : refus de connexion,
  compte hors liste, Paris/Tokyo, cookies, reload, deconnexion et sauvegardes.
- PC, Razr, petit telephone, paysage et Reduced Motion ; registre et transferts
  uniquement sur fixtures, jamais de transaction de carte sur le service reel.
- Controle public anonyme apres publication, aucun mot de passe reel injecte
  automatiquement. Premiere connexion reelle reservee au titulaire.

Preuves et captures repetees : `work/qa/login/` et `work/qa/login-release/`.
Build exact du commit via `prepare-release.cjs`, publication directe Cloudflare.
La recuperation email reste soumise aux limites SMTP du service gratuit ; aucun
email reel envoye comme test. Aucun abonnement ou compte professionnel utilise.

[Contrat courant](../../docs/REGISTRE_EN_LIGNE.md) |
[Publication](../../deploy/README.md)
