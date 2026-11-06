import { CONTENT } from "@/app/roles"
import type { FeatureRoute } from "@/app/routes"

export const expertRoutes: FeatureRoute[] = [
  { path: "/experts", roles: CONTENT, load: () => import("./pages/ExpertsPage").then((m) => ({ default: m.ExpertsPage })) },
  { path: "/experts/:id", roles: CONTENT, load: () => import("./pages/ExpertPage").then((m) => ({ default: m.ExpertPage })) },
]
