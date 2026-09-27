# Reprise transparente de preparation

Le premier `build.cjs prepare`, apres le GO natif du parent, est sorti avec code
1 sans diagnostic standard. Le processus Node 24092 n'existait plus au controle.
Aucun `preparation.json` ni dossier de composants natifs n'avait encore ete
produit ; aucun Photoshop n'avait ete lance par ce processus.

Le verrou appartenait explicitement a ce lot :
`cbaf93c6-aebb-4288-8105-a59e1cab08f8`, kind
`2026-09-27-metal-gear-mines-production`. Apres confirmation de l'absence du PID,
ce verrou a ete deplace, sans suppression, vers
`prepare-aborted-cbaf93c6.lock.json` dans ce dossier.

La cause exacte n'est pas etablie. Pour reduire la pression memoire, la fonction
locale `preservation.cjs:digest` a ete remplacee par un hachage SHA-256 synchrone
en blocs de 1 Mio au lieu de charger chaque PSD entier avec `readFileSync`.
Les memes fichiers restent controles integralement, octet pour octet. Il n'y a
ni exclusion, ni assouplissement de comparaison, ni changement du format du gel.

`dependencies.json` et `existing-created.snapshot.json` crees avant cet arret
n'ont PAS ete renouveles. La seconde preparation a recontrole leurs empreintes,
puis termine les 13 cartes avec les 62 creations precedentes inchangees.
La reference reste
`ef7a6767b57723d896ceecb050079bfb1abad0e79e7289a200f87b34585f9380`.

La correction du lecteur de hash precede toutes les preparations finales ; son
empreinte est donc incluse dans les entrees de chaque `preparation.json`.
Les fichiers natifs et le catalogue actifs n'ont pas ete ecrits par la reprise.
