import { CONTENT } from "@/app/roles"
import { recordRoutes } from "@/features/records"

export const expertRoutes = recordRoutes("/experts", CONTENT, () => import("./config").then((m) => m.expertConfig))
