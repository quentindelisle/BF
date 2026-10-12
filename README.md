# Observ'BF — Boxe française Savate (CA4) · N'EPS numérique

PWA pour iPad (paysage) : observation des touches par les élèves, chrono, tournoi de classe par groupes, export Excel.

## Mise en ligne (GitHub Pages)
1. Pousser le contenu de ce dossier sur la branche `main`.
2. Settings → Pages → *Deploy from a branch* → `main` / `(root)`.
3. Sur l'iPad : ouvrir `https://<utilisateur>.github.io/<dépôt>/` dans Safari → Partager → **Sur l'écran d'accueil**.
4. À chaque mise à jour, changer `VERSION` dans `sw.js`.

## Déroulé
- **Espace prof** : importer la classe (.xlsx : `NOM Prénom` en A, ou `Nom` en A et `Prénom` en B ; colonne F/G facultative), régler le nombre de groupes et glisser les élèves, régler la durée du tournoi, choisir le groupe de la tablette.
- **Espace élève** : l'assaut suivant s'affiche avec les tireurs et les juges (rotation automatique). Les élèves saisissent les touches : rouge à gauche, bleu à droite, en même temps.
- **Geste** : départ sur le gant (droit = direct, courbe = crochet) ou sur la chaussure (droit = chassé, courbe = fouetté), arrivée sur la cible.
- **Fin du chrono** : le résultat s'affiche, les élèves le valident, puis l'assaut suivant arrive automatiquement.
- **Résultats** : classements, stats par élève, export Excel complet ; sauvegarde .json pour préparer ou fusionner plusieurs tablettes.

Les données restent sur la tablette (stockage local). Bibliothèque Excel : SheetJS (Apache 2.0). Polices : Barlow (OFL).
