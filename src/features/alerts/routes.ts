import { CONTENT } from "@/app/roles"
import type { FeatureRoute } from "@/app/routes"

export const alertRoutes: FeatureRoute[] = [
  { path: "/alertes", roles: CONTENT, load: () => import("./pages/AlertsPage").then((m) => ({ default: m.AlertsPage })) },
]
