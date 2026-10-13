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

Geste : départ sur le gant (droit = direct, courbe = crochet) ou la chaussure (droit = chassé, courbe = fouetté), arrivée sur la cible.

Bibliothèques : SheetJS (Apache 2.0), qrcode-generator, jsQR, ZXing (lib/). Polices Barlow (OFL).
