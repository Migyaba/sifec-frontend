import type { FeatureRoute } from "@/app/routes"

/** Tarification : chef de département (et ses délégués, que le serveur reconnaît). */
export const pricingRoutes: FeatureRoute[] = [
  { path: "/tarification", roles: ["chef_departement"], load: () => import("./PricingPage").then((m) => ({ default: m.PricingPage })) },
]
