# SIFEC Offrea : interface web

Interface React + TypeScript de la plateforme SIFEC, qui consomme l'API du dépôt `sifec-backend`.

- Produit et contraintes : [PRODUCT.md](PRODUCT.md)
- Système visuel : [DESIGN.md](DESIGN.md), page `/systeme` de l'application
- Plan de construction : `Plan d'exécution frontend.md`, à côté des deux dépôts

## Démarrer

```
npm install
npm run dev
```

L'interface est servie sur `http://localhost:5173`. Les appels à `/api` passent par le proxy de Vite vers le backend (`http://localhost:8000`) : la session Django par cookie demande la même origine. En développement, le backend accepte les écritures venues de `http://localhost:5173` ; pour un autre port, le déclarer dans `DJANGO_CSRF_TRUSTED_ORIGINS` côté backend.

## Client de l'API

`src/api/schema.d.ts` est généré, jamais modifié à la main. Après un changement de l'API du backend : `npm run api`, puis `npm run build`, qui signale les écrans à adapter. Le générateur est lancé à versions fixées, avec son propre TypeScript 5 : le projet est en TypeScript 7, qui n'a plus l'interface JavaScript dont il a besoin.

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Vérification des types et construction |
| `npm run lint` | Lint (oxlint) |
| `npm run test` | Tests (Vitest) |
| `npm run api` | Régénère `src/api/schema.d.ts` depuis `../sifec-backend/openapi/schema.yml` |
| `npm run api:check` | Échoue si le client ne correspond plus au schéma du backend (`SIFEC_SCHEMA` pour un autre chemin) |
| `npm run lint:modules` | Frontières entre modules (dependency-cruiser) |
| `npm run e2e` | Parcours réels Playwright contre le vrai backend |
| `npm run preview` | Aperçu de la construction |

## Parcours Playwright

Les parcours jouent l'interface contre le vrai backend, sur une base jetable `sifec_e2e`, recréée à chaque lancement : la base de travail n'est jamais touchée.

1. Dans `sifec-backend` : `docker compose up -d --no-deps db redis`.
2. Ici : `npm run e2e`. Playwright lance `scripts/e2e-backend.sh` (base, migrations, comptes de `tests/e2e/seed.py`, serveur sur le port 8000) puis Vite sur le port 5174.

## Intégration continue

`.github/workflows/ci.yml` : lint, frontières, types, tests, contrat de l'API, puis les parcours réels. Le dépôt `sifec-backend` étant privé, le secret `SIFEC_BACKEND_TOKEN` (jeton en lecture seule sur ce dépôt) doit être déclaré dans les réglages du dépôt.
