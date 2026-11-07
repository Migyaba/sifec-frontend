import { CONTENT } from "@/app/roles"
import type { FeatureRoute } from "@/app/routes"

/** Avis et fiche d'exigences (UC06, UC07, UC14). */
export const tenderRoutes: FeatureRoute[] = [
  { path: "/avis", roles: CONTENT, load: () => import("./pages/TendersPage").then((m) => ({ default: m.TendersPage })) },
  { path: "/avis/:id", roles: CONTENT, load: () => import("./pages/TenderPage").then((m) => ({ default: m.TenderPage })) },
]
