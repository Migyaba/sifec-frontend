# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + TypeScript (Vite), Tailwind CSS et shadcn/ui sur Radix, choisis par l'utilisateur le 6 novembre 2026. Le client de l'API est généré depuis `../sifec-backend/openapi/schema.yml` (openapi-typescript) : l'interface et le backend ne peuvent pas diverger sans que la compilation le signale. Session Django par cookie, même origine, `/api` passé par le proxy de Vite en développement (voir `../sifec-backend/docs/API.md`).

## Users

Le personnel du Cabinet SIFEC, cabinet de conseil (audit, expertise comptable, ingénierie financière, contrôle interne, formation) qui répond à des avis de marchés de prestations intellectuelles. Environ 20 utilisateurs au départ :

- **chef de département** : décide (Go / No-Go, prix final, validation finale, export) ;
- **chefs de pôle** (1 à 3) : valident la fiche d'exigences, le témoin, la validation technique, établissent les grilles de recette ;
- **collaborateurs** (jusqu'à 15) : déposent les avis, saisissent et vérifient les fiches, montent les dossiers ;
- **administrateur technique** : comptes et paramètres, sans accès au contenu des dossiers.

Ils travaillent au bureau, sur ordinateur, souvent sous la pression d'une date limite de dépôt.

## Product Purpose

SIFEC Offrea prépare les réponses du Cabinet aux avis à manifestation d'intérêt (AMI) et aux demandes de propositions (DDP) : lecture de l'avis et extraction des exigences, choix d'un dossier témoin, des experts, des références et des pièces, méthodologie, planning, offre financière, contrôle de conformité, export Word, PDF et Excel. L'agent prépare, les responsables décident. Réussir, c'est déposer un dossier sans information inventée, sans pièce expirée, sans nom d'un ancien client, sans erreur de calcul, en moins de temps.

## Positioning

Chaque donnée insérée dans un dossier est recopiée d'une fiche validée et garde son lien vers la pièce source (page, date). Rien de vérifiable n'est inventé : une valeur absente s'affiche MANQUANT et bloque l'export. Cinq validations humaines journalisées encadrent une DDP (quatre pour un AMI), et personne ne valide son propre travail.

## Operating Context

- Parcours DDP en 11 étapes et 5 validations ; parcours AMI en 8 étapes et 4 validations. Une modification en amont remet à valider les étapes suivantes.
- Base documentaire reprise d'un dossier réseau existant : pièces administratives, CV, attestations, anciens dossiers, souvent scannés.
- Niveaux de confiance affichés sur chaque donnée : vert (fiche validée, pièce source disponible), orange (scan, reformulation ou fiche non validée, à vérifier), rouge (sans source, contradictoire ou expirée, export bloqué).
- Les dossiers produits sont des fichiers Word, PDF et Excel déposés auprès des bailleurs et autorités contractantes.

## Capabilities and Constraints

- Version 1 : AMI et DDP de prestations intellectuelles uniquement. Les DAO (travaux et fournitures) sont hors V1, même si le slogan du logo les cite ; aucun écran DAO.
- Interface et dossiers en français.
- Écrans : ordinateur d'abord ; tableau de bord, alertes et validations lisibles sur tablette.
- Le backend expose 286 routes, décrites dans le schéma OpenAPI ; chaque écran correspond à un cas d'utilisation (UC01 à UC16) ou à une action précise.
- Double authentification, droits par rôle, journal de chaque action.
- Questions ouvertes au Cabinet : section 10 du `Plan d'exécution backend.md`.

## Brand Commitments

- Nom du produit : **SIFEC Offrea**, slogan « AMI, DAO et DDP ». Logo fourni le 6 novembre 2026 : document coché dans un carré vert arrondi, soleil orange, « sifec » en vert, « offrea » en bleu.
- Couleurs imposées, relevées sur le logo : vert `#7C9A1E`, bleu `#2167A2`, orange `#F29200`, marine `#1D3447`, vert pâle `#D5DFAB`.
- Ton : sobre, précis, en français administratif clair. Jamais de tiret long dans les textes.

## Evidence on Hand

- Logo : fichier fourni par l'utilisateur (à déposer dans `public/brand/`).
- Pas encore de polices, de modèles ni de dossiers exemplaires du Cabinet (question B3) : aucune charte au-delà du logo ne doit être inventée.
- Aucune donnée réelle dans l'interface de démonstration : exemples fictifs, signalés comme tels.

## Product Principles

1. La preuve d'abord : toute valeur affiche son origine et son niveau de confiance ; une valeur sans source se voit.
2. L'outil prépare, une personne décide : chaque validation est explicite, nominative et réversible seulement par la voie prévue.
3. Rien de caché : ce qui manque, ce qui est périmé, ce qui reste à juger est dit, jamais lissé.
4. La date limite commande : l'état du dossier et ce qui bloque le dépôt se lisent en un coup d'œil.

## Accessibility & Inclusion

WCAG 2.2 AA. Les niveaux de confiance ne reposent jamais sur la couleur seule : chaque état porte un libellé et une icône. Navigation complète au clavier.
