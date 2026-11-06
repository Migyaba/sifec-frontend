import { CONTENT } from "@/app/roles"
import { recordRoutes } from "@/features/records"

export const pastDossierRoutes = recordRoutes("/anciens-dossiers", CONTENT, () => import("./config").then((m) => m.pastDossierConfig))
