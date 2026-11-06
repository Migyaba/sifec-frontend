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

L'interface est servie sur `http://localhost:5173`. Les appels à `/api` passent par le proxy de Vite vers le backend (`http://localhost:8000`) : la session Django par cookie demande la même origine.

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Vérification des types et construction |
| `npm run lint` | Lint (oxlint) |
| `npm run preview` | Aperçu de la construction |
