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
- **Valeurs des touches** : poing 1 pt · pied bas 1 / médian 2 / haut 4 · enchaînement sans bonus (noté dans les stats) · la garde et le vide ne comptent pas.
- **Leçon du jour** : Constituer les groupes + 🏁 Tournoi (temps d'assaut fixe, ou temps de tournoi fixe réparti par groupe). Tournoi inachevé : classement pondéré (note = points/reprise × reprises prévues × (0,5 + 0,5 × reprises disputées ÷ prévues)).
- **Bilans** : personnage au centre, touches par cible et par arme, camembert poings / pieds ; l'observation n'est plus corrigeable une fois le bilan affiché.
- **Noms** : « Prénom N. » partout (nom complet seulement en cas d'homonyme) ; l'export Excel garde les noms complets.

## Version 3.5 — capacité de juger (fil rouge), deux piliers
- **Paramètres du cycle → Capacité de juger** : un niveau par leçon, ou niveaux différenciés par élève (débutant → débrouillé → complet). Le niveau se règle dans **Leçon du jour → 🎚 Niveaux de jugement** ; en fin de leçon, on change le niveau des élèves (suggestions d'après l'observation du pilier). Le mode expert se déclenche à la main (une tablette par élève observé).
- Chaque coach saisit au niveau de son propre profil : l'écran de chaque moitié s'adapte (case unique, gant / chaussure, hauteurs).
- Jusqu'à **deux piliers** par leçon ; tableau des leçons avec en-têtes explicatifs.

## Version 3.6 — mode Inclusion et saisie vocale (option)
- **Mode Inclusion** (écran de préparation de l'assaut) : un seul observateur par tablette, trois niveaux : **N1** touche seule (tout le personnage se colore), **N2** poing ou pied, **N3** poing / pied + hauteur (poing : haut ou médian ; pied : haut, médian ou bas). Le mode classique (deux coachs) reste inchangé, avec la même coloration du personnage entier pour les touches sans hauteur.
- **Saisie vocale** (Paramètres du cycle, désactivée par défaut) : module `vocal-eps/` (Vosk, 100 % hors ligne). Un bouton micro « Parler » (appui maintenu) apparaît côté observé en mode Inclusion ; la voix appelle la même fonction que le geste (`saisirTouche`). Phrases : N1 « touche » · N2 « fouetté », « chassé », « crochet », « direct » (l'arme est déduite du coup) · N3 coup + hauteur (« fouetté haut », « chassé médiane », « crochet bas »). La saisie tactile reste toujours disponible, avec un grand bouton « Annuler la dernière touche ».
- Le premier chargement du modèle télécharge 52 Mo : à faire sur le Wi-Fi, avant la séance, sur chaque tablette. Le service worker ne met pas le modèle en cache (Vosk le garde sur l'appareil).
- Crédits : Vosk (Apache 2.0) ; modèle français de Paul Guyot (CC BY-NC-SA 4.0, usage non commercial), voir `vocal-eps/modeles/LICENCE-modele-fr.txt`.

## Version 3.7 — lexique à l'écran et écoute continue (mode Inclusion)
- Le **lexique du niveau** (N1 / N2 / N3) s'affiche à côté du personnage ; ce que la tablette reconnaît se **surligne en direct** (jaune pendant que l'on parle, vert quand la touche est enregistrée, rouge si incomplet).
- **Écoute continue** (bouton sous « Parler ») : le micro reste ouvert pendant tout l'assaut et chaque touche annoncée s'ajoute l'une après l'autre. Il se coupe à la fin de l'assaut.

## Version 3.8 — saisie latérale, hors distance
- **Disposition de la saisie** au choix de chaque observateur, sur l'écran de saisie (bouton ⬇ « En bas » / ↔ « Latéral ») : en bas (inchangé) ou latérale (gant et chaussure de chaque côté, on glisse vers le centre où se trouve le boxeur ; en expert, il faut dépasser le milieu de la tablette pour toucher le côté opposé). Mémorisé sur la tablette.
- **💥 Trop fort** plus visible (bouton large, orange, qui reste allumé tant que la dernière frappe est marquée) et nouveau **📏 Hors distance** (l'attaquant était trop proche : dernière frappe non valable, pénalité réglable dans Paramètres du cycle, 0 par défaut). Compté dans le bilan, les stats et l'export.

## Version 3.9 — modes de saisie choisis avant chaque assaut, geste minimal 4 cm
- **Avant chaque assaut**, chaque observateur choisit son **mode de saisie** — *Nb de doigts = Hauteur* (départ sur le gant / la chaussure, comme avant) · *Nb de doigts = Arme* (1 doigt = poing, 2 doigts = pied, départ n'importe où ; la hauteur vient de l'inclinaison du tracé : monte = haut, à plat = médian, descend = bas) · *Adapté (interface sonore)* (voix + lexique, un seul observateur) — et son **niveau** : Débutant, Débrouillé, Complet ou Expert (Adapté et Expert : un seul observateur par tablette).
- **Plus de touche par simple appui** : un geste de moins de **4 cm** (réglable) n'est jamais compté. Le bouton « Étalonner » règle la taille de 4 cm sur chaque tablette (par défaut déduite du modèle d'iPad).

## Version 3.10 — récap animé de l'assaut
- En fin d'assaut (bilan) et dans Résultats → Classements → Assauts : **🎬 Revoir l'assaut**. Deux boxeurs en vue de 3/4, dessinés dans l'esthétique de l'appli, rejouent les coups saisis **au moment où ils ont été saisis**, à la bonne hauteur et avec la bonne technique (direct, crochet, chassé, fouetté ; haut, médian, bas), avec impact coloré, étiquette et score en direct.
- Vitesses **×1, ×1,5, ×2**, pause, retour au début, curseur de navigation avec repères des coups. Les temps morts de plus de 5 s sont raccourcis.

## Version 3.11 — récap en 3D
- Le récap de l'assaut est désormais **en 3D** : deux boxeurs modélisés avec un squelette articulé (genoux et coudes = charnières qui ne plient que dans le bon sens, cinématique inverse pour amener le gant ou le pied sur la cible à la bonne hauteur), vus de 3/4. Moteur 3D minimal intégré (aucune bibliothèque, fonctionne hors ligne). On peut **glisser sur l'image pour tourner la caméra** (double toucher pour revenir à la vue d'origine).

## Version 3.12 — récap 3D avec les personnages de l'appli
- Le récap 3D reprend les **illustrations de l'appli** : les **visages** (garçon, fille, non genré, au coin rouge ou bleu), les **gants** et les **chaussures** (`img/`), le **logo N'EPS** du tee, les couleurs de la tenue (pantalon marine à bandes blanches, short pour le non genré, liserés rouge ou bleu). Les images sont dessinées sur le squelette 3D (visage orienté vers l'adversaire, gant aligné sur l'avant-bras, chaussure alignée sur le pied). De dos, la tête passe en cheveux.
