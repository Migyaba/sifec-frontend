import type { Role } from "@/app/roles"
import type { FeatureRoute } from "@/app/routes"

import type { RecordConfig } from "./RecordPages"

/** Les deux routes d'un type de fiche (liste, fiche), chargées à la demande avec sa description. */
export function recordRoutes(route: string, roles: Role[], load: () => Promise<RecordConfig>): FeatureRoute[] {
  return [
    {
      path: route,
      roles,
      load: async () => {
        const [config, pages] = await Promise.all([load(), import("./RecordPages")])
        return { default: () => <pages.RecordListPage config={config} /> }
      },
    },
    {
      path: `${route}/:id`,
      roles,
      load: async () => {
        const [config, pages] = await Promise.all([load(), import("./RecordPages")])
        return { default: () => <pages.RecordDetailPage config={config} /> }
      },
    },
  ]
}
