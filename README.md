# Observ'BF — Boxe française Savate (CA4) · N'EPS numérique

PWA pour iPad (paysage) : observation des touches par les élèves, chrono, tournoi de classe par groupes, rôles de juges, piliers d'apprentissage, échanges par QR codes, export Excel. Organisation reprise de l'appli Biathlon.

## Mise en ligne (GitHub Pages, HTTPS obligatoire pour la caméra)
1. Pousser ce dossier sur `main`, puis Settings → Pages → *Deploy from a branch* → `main` / `(root)`.
2. iPad : ouvrir l'adresse dans Safari → Partager → **Sur l'écran d'accueil** (ou scanner le QR « Installer l'appli » du menu enseignant).
3. À chaque mise à jour, changer `VERSION` dans `sw.js`.

## Rôles des tablettes
Au premier lancement : **tablette enseignant** (code par défaut 0000) ou **tablette élève**.

## Espace enseignant (4 étapes)
1. **Préparer le cycle** : classe et élèves (import Excel : `NOM Prénom` en A, ou `NOM` en A et `Prénom` en B ; colonne F/G reconnue), groupes colorés (glisser-déposer), paramètres du cycle (leçons, titre, pilier, durée du tournoi, reprises, juges de points, barème), piliers.
2. **Leçon du jour** : appel, assauts et rôles (arbitre, coach rouge, coach bleu, repos au-delà de 5 élèves, rotation automatique), **QR de la leçon**.
3. **Récupérer** : scanner les QR « Envoyer » des tablettes élèves.
4. **Résultats et bilans** : classements par leçon, stats élèves, bilan des piliers, export Excel, sauvegarde.

## Tablette élève
Scanner la leçon → choisir son groupe → Assauts (tireurs, arbitre et coachs proposés, conseil du pilier) → chaque coach saisit les touches de son tireur (rouge à gauche, bleu à droite) ; les zones du mannequin se colorent selon le nombre de touches (2 vert, 3 jaune, 4 orange, 5+ rouge) → pendant la récupération, choix de l'arme bonus → résultat et observation du pilier → assaut suivant automatique → **Envoyer** (QR) au prof.

Saisie « sans regarder » (par défaut, module `js/boxe-saisie.js`) : le geste commence à gauche (rouge) ou à droite (bleu), en haut de l'écran pour un **poing**, en bas pour un **pied**. Trajectoire droite = direct / chassé, courbe = crochet / fouetté. **1, 2 ou 3 doigts** = bas, milieu, haut (poing : ventre, épaules/torse, visage · pied : jambes, flancs, visage). Tap à **4 doigts** = annuler. « Dans le vide » transforme la dernière touche en coup dans le vide. Retour sonore (grave = poing, aigu = pied, 1 à 3 bips = hauteur) et vibration.
Ancien mode (du gant ou de la chaussure jusqu'à la cible) : réglable dans *Paramètres du cycle → Mode de saisie*.

Bibliothèques : SheetJS (Apache 2.0), qrcode-generator, jsQR, ZXing (lib/). Polices Barlow (OFL).

## Combattants : garçon, fille, non genré
Le dessin du combattant suit le sexe saisi pour chaque élève (**G / F / N**, touche sur la pastille pour changer). Illustrations dans `img/` (`fig-g|f|n-r|b.webp`, gants et chaussures `glove-*`, `shoe-*`), zones de touche dans `js/figures.js`. Zones : visage, tronc (épaules / torse), ventre, flancs, jambes, plus épaules / bras / gants (garde, 0 point).
Import de classe : l'export « Nom · Prénom · Né(e) le · Prénom d'usage · Sexe · Classe… » est reconnu (prénom d'usage préféré, Sexe M / F / X, une classe créée par valeur de la colonne Classe). Allergies, projet d'accompagnement et autres colonnes ne sont jamais importés.
