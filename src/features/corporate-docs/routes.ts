import { CONTENT } from "@/app/roles"
import { recordRoutes } from "@/features/records"

export const corporateDocRoutes = recordRoutes("/pieces", CONTENT, () => import("./config").then((m) => m.corporateDocConfig))
