import { CONTENT } from "@/app/roles"
import { recordRoutes } from "@/features/records"

export const libraryRoutes = [
  ...recordRoutes("/methodologies", CONTENT, () => import("./configs").then((m) => m.methodologyConfig)),
  ...recordRoutes("/formulaires", CONTENT, () => import("./configs").then((m) => m.formTemplateConfig)),
  ...recordRoutes("/modeles", CONTENT, () => import("./configs").then((m) => m.docTemplateConfig)),
  ...recordRoutes("/blocs", CONTENT, () => import("./configs").then((m) => m.textBlockConfig)),
]
