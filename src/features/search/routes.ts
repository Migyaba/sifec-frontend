import { CONTENT } from "@/app/roles"
import type { FeatureRoute } from "@/app/routes"

export const searchRoutes: FeatureRoute[] = [
  { path: "/recherche", roles: CONTENT, load: () => import("./pages/SearchPage").then((m) => ({ default: m.SearchPage })) },
]
