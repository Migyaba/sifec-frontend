/**
 * Frontières entre modules (plan de l'interface, §3) : un module n'importe d'un autre que son
 * `index.ts` ; les briques communes ne dépendent d'aucun module ; le client de l'API ne dépend de
 * rien d'autre.
 */
module.exports = {
  forbidden: [
    {
      name: "module-par-son-index",
      comment: "Un module n'utilise d'un autre que ce que son index.ts expose.",
      severity: "error",
      from: { path: "^src/features/([^/]+)/" },
      to: { path: "^src/features/([^/]+)/", pathNot: ["^src/features/$1/", "^src/features/[^/]+/index\\.ts$"] },
    },
    {
      name: "briques-communes-sans-module",
      comment: "components/, api/ et lib/ servent tous les modules et n'en connaissent aucun.",
      severity: "error",
      from: { path: "^src/(components|api|lib)/" },
      to: { path: "^src/(features|pages)/" },
    },
    {
      name: "api-autonome",
      comment: "Le client de l'API ne dépend que de lui-même.",
      severity: "error",
      from: { path: "^src/api/" },
      to: { path: "^src/", pathNot: "^src/api/" },
    },
    {
      name: "pas-de-cycle",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.app.json" },
    tsPreCompilationDeps: true,
    // TypeScript 7 n'a pas encore d'interface JavaScript : swc lit les sources à sa place.
    parser: "swc",
    exclude: { path: "\\.test\\.tsx?$|src/test/" },
  },
}
