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

Saisie « sans regarder » (module `js/boxe-saisie.js`) : le geste commence à gauche (rouge) ou à droite (bleu), dans la moitié haute (bouton gant = **poing**) ou basse (bouton chaussure = **pied**). Trajectoire droite = direct / chassé, courbe = crochet / fouetté. **1, 2 ou 3 doigts** = bas, milieu, haut. Tap à **4 doigts** ou ↩️ = annuler · 💥 = frappe trop forte · 🔗 = enchaînement (uniquement si le pilier de la leçon est « Enchaîner ») · **appui long sur « Terminer l'assaut »** = déclarer un abandon. Tout est détaillé dans la **Notice de saisie** de l'espace enseignant.

Bibliothèques : SheetJS (Apache 2.0), qrcode-generator, jsQR, ZXing (lib/). Polices Barlow (OFL).

## Combattants : garçon, fille, non genré
Le dessin du combattant suit le sexe saisi pour chaque élève (**G / F / N**, touche sur la pastille pour changer). Illustrations dans `img/` (`fig-g|f|n-r|b.webp`, gants et chaussures `glove-*`, `shoe-*`), zones de touche dans `js/figures.js`. Zones : visage, tronc (épaules / torse), ventre, flancs, jambes, plus épaules / bras / gants (garde, 0 point).
Import de classe : l'export « Nom · Prénom · Né(e) le · Prénom d'usage · Sexe · Classe… » est reconnu (prénom d'usage préféré, Sexe M / F / X, une classe créée par valeur de la colonne Classe). Allergies, projet d'accompagnement et autres colonnes ne sont jamais importés.

## Constituer les groupes
Libre (toucher un élève puis son groupe, ou glisser), selon les **besoins** ou les **niveaux** (renseignés élève par élève dans Classe & élèves), en composition hétérogène (serpentin) ou homogène (tranches). Jusqu'à 5 groupes sur la largeur.

## Plusieurs tablettes
Une tablette sans leçon peut lancer un assaut libre (noms saisis). Chaque touche est horodatée : à la réception (QR ou fichier), les touches d'un même assaut observé sur deux tablettes s'additionnent sans doublon. « Envoyer → 🔁 » relaie aussi les assauts reçus d'une autre tablette.

## Version 3.4 — niveaux de jugement, tournoi, bilans

- **Saisie** : départ sur les boutons gant / chaussure en bas de chaque moitié ; poing 1 doigt = ventre, 2 doigts = visage ; pied 1 / 2 / 3 doigts = jambes / flancs / visage ; double tap = enchaînement (touche précédente + suivante en moins de 2,5 s) ; 4 doigts = annuler ; 💥 = dernière frappe seulement.
- **Niveaux de jugement par leçon** (Paramètres du cycle) : Débutant (une case), Débrouillé (armes), Jugement complet (armes + hauteurs), Expert (un observateur, pied G · poing G · poing D · pied D, côté touché, coups croisés). Armes autorisées, enchaînements et arme bonus se choisissent aussi leçon par leçon.
- **Valeurs des touches** : poing 1 pt · pied bas 1 / médian 2 / haut 4 · enchaînement validé +2 · la garde et le vide ne comptent pas.
- **Leçon du jour** : Constituer les groupes + 🏁 Tournoi (temps d'assaut fixe, ou temps de tournoi fixe réparti par groupe). Tournoi inachevé : classement pondéré (note = points/reprise × reprises prévues × (0,5 + 0,5 × reprises disputées ÷ prévues)).
- **Bilans** : personnage au centre, touches par cible et par arme, camembert poings / pieds ; l'observation n'est plus corrigeable une fois le bilan affiché.
- **Noms** : « Prénom N. » partout (nom complet seulement en cas d'homonyme) ; l'export Excel garde les noms complets.
