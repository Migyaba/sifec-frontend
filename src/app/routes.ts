import type { Role } from "./roles"

/** Route d'un module : son écran est chargé à la demande (plan de l'interface, §4.11). */
export type FeatureRoute = {
  path: string
  roles: Role[]
  load: () => Promise<{ default: React.ComponentType }>
}
