import { CONTENT } from "@/app/roles"
import { recordRoutes } from "@/features/records"

export const institutionRoutes = recordRoutes("/institutions", CONTENT, () => import("./config").then((m) => m.institutionConfig))
