import { SUPERVISORS } from "@/app/roles"
import type { FeatureRoute } from "@/app/routes"

/** Reprise de l'existant : chef de département et chef de pôle (politique backfill.manage). */
export const backfillRoutes: FeatureRoute[] = [
  { path: "/reprise", roles: SUPERVISORS, load: () => import("./pages/BatchesPage").then((m) => ({ default: m.BatchesPage })) },
  { path: "/reprise/:id", roles: SUPERVISORS, load: () => import("./pages/BatchPage").then((m) => ({ default: m.BatchPage })) },
]
