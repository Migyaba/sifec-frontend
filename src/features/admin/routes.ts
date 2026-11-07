import type { FeatureRoute } from "@/app/routes"
import { EVERYONE } from "@/app/roles"

/** Administration (UC16) : comptes, délégations, paramètres, journal. */
export const adminRoutes: FeatureRoute[] = [
  {
    path: "/comptes",
    roles: ["admin_technique"],
    load: () => import("./pages/AccountsPage").then((m) => ({ default: m.AccountsPage })),
  },
  {
    path: "/delegations",
    roles: EVERYONE,
    load: () =>
      import("./pages/DelegationsPage").then((m) => ({
        default: m.DelegationsPage,
      })),
  },
  {
    path: "/parametres",
    roles: ["chef_departement"],
    load: () =>
      import("./pages/ParametersPage").then((m) => ({
        default: m.ParametersPage,
      })),
  },
  {
    path: "/journal",
    roles: ["chef_departement", "admin_technique"],
    load: () => import("./pages/JournalPage").then((m) => ({ default: m.JournalPage })),
  },
]
