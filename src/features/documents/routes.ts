import type { FeatureRoute } from "@/app/routes"
import { CONTENT } from "@/app/roles"

export const documentRoutes: FeatureRoute[] = [
  { path: "/documents", roles: CONTENT, load: () => import("./pages/DocumentsPage").then((m) => ({ default: m.DocumentsPage })) },
  { path: "/documents/:id", roles: CONTENT, load: () => import("./pages/DocumentPage").then((m) => ({ default: m.DocumentPage })) },
]
