import { CONTENT } from "@/app/roles"
import type { FeatureRoute } from "@/app/routes"

/** Dossiers de réponse, leur parcours et les validations en attente (UC08). */
export const bidRoutes: FeatureRoute[] = [
  { path: "/dossiers", roles: CONTENT, load: () => import("./pages/BidsPage").then((m) => ({ default: m.BidsPage })) },
  { path: "/dossiers/:id", roles: CONTENT, load: () => import("./pages/BidPage").then((m) => ({ default: m.BidPage })) },
  { path: "/validations", roles: CONTENT, load: () => import("./pages/ValidationsPage").then((m) => ({ default: m.ValidationsPage })) },
]
