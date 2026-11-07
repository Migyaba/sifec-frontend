import { CONTENT } from "@/app/roles"
import type { FeatureRoute } from "@/app/routes"

export const dashboardRoutes: FeatureRoute[] = [
  { path: "/tableau-de-bord", roles: CONTENT, load: () => import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })) },
]
