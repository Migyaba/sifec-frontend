import { CONTENT } from "@/app/roles"
import { recordRoutes } from "@/features/records"

export const missionRoutes = recordRoutes("/references", CONTENT, () => import("./config").then((m) => m.missionConfig))
