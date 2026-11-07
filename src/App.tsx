import { QueryClientProvider, type QueryClient } from "@tanstack/react-query"
import { lazy, Suspense, useEffect, useState } from "react"
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router"

import { makeQueryClient, onUnauthorized } from "@/api"
import { ALL_ITEMS, DESIGN_ITEM, homeFor } from "@/app/navigation"
import { hasAccess, type Role } from "@/app/roles"
import type { FeatureRoute } from "@/app/routes"
import { ConfirmProvider } from "@/components/confirm"
import { ScreenBoundary } from "@/components/sifec/ScreenBoundary"
import { AppShell } from "@/components/sifec/shell"
import { TaskAnnouncer } from "@/components/tasks"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  LoginPage,
  OtpSetupPage,
  OtpVerifyPage,
  RequireSession,
  sessionKey,
  useLogout,
  useSession,
  type Session,
} from "@/features/auth"
import { adminRoutes, useGrants } from "@/features/admin"
import { documentRoutes } from "@/features/documents"
import { alertRoutes, NotificationBell } from "@/features/alerts"
import { backfillRoutes } from "@/features/backfill"
import { corporateDocRoutes } from "@/features/corporate-docs"
import { dashboardRoutes } from "@/features/dashboard"
import { expertRoutes } from "@/features/experts"
import { institutionRoutes } from "@/features/institutions"
import { libraryRoutes } from "@/features/library"
import { missionRoutes } from "@/features/missions"
import { pastDossierRoutes } from "@/features/past-dossiers"
import { pricingRoutes } from "@/features/pricing"
import { searchRoutes } from "@/features/search"
import { tenderRoutes } from "@/features/tenders"
import { DesignSystemPage } from "@/pages/DesignSystem"
import { ForbiddenPage, NotFoundPage, PlannedPage } from "@/pages/StatusPages"

/** Une session expirée ailleurs que sur `auth/session/` fait relire la session : la garde redirige. */
function useSessionExpiry(client: QueryClient) {
  useEffect(
    () =>
      onUnauthorized((url) => {
        if (url.includes("/api/v1/auth/")) return
        void client.invalidateQueries({ queryKey: sessionKey })
      }),
    [client],
  )
}

function RequireRole({ roles, grants, children }: { roles: Role[]; grants?: string[]; children: React.ReactNode }) {
  const { data } = useSession()
  const held = useGrants(grants ? data?.user.id : undefined)
  if (hasAccess(data?.user, roles, grants, held.data)) return children
  // Une délégation se vérifie avant de refuser l'écran.
  return grants && held.isPending ? null : <ForbiddenPage />
}

function Frame({ session }: { session: Session }) {
  const logout = useLogout()
  const location = useLocation()
  const grants = useGrants(session.user.id)
  return (
    <AppShell user={session.user} onLogout={() => logout.mutate()} actions={<NotificationBell />} grants={grants.data}>
      <ScreenBoundary key={location.pathname}>
        <Outlet />
      </ScreenBoundary>
    </AppShell>
  )
}

function Shell() {
  return <RequireSession>{(session: Session) => <Frame session={session} />}</RequireSession>
}

/** Écrans des modules construits ; les autres entrées du menu disent quel lot les apporte. */
const FEATURE_ROUTES: FeatureRoute[] = [
  ...documentRoutes,
  ...expertRoutes,
  ...missionRoutes,
  ...corporateDocRoutes,
  ...institutionRoutes,
  ...pastDossierRoutes,
  ...searchRoutes,
  ...backfillRoutes,
  ...libraryRoutes,
  ...pricingRoutes,
  ...alertRoutes,
  ...dashboardRoutes,
  ...adminRoutes,
  ...tenderRoutes,
]
const SCREENS = FEATURE_ROUTES.map((route) => ({ ...route, Screen: lazy(route.load) }))
const BUILT = new Set(FEATURE_ROUTES.map((route) => route.path))

function Loading() {
  return <div className="px-[3%] pt-8 text-sm text-ink-muted" role="status">Chargement de l'écran</div>
}

function Home() {
  const { data } = useSession()
  return data ? <Navigate to={homeFor(data.user.role)} replace /> : null
}

function NotFound() {
  const { data } = useSession()
  return <NotFoundPage home={data ? homeFor(data.user.role) : "/"} />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/connexion" element={<LoginPage />} />
      <Route path="/connexion/code" element={<OtpVerifyPage />} />
      <Route path="/connexion/activation" element={<OtpSetupPage />} />
      <Route element={<Shell />}>
        <Route index element={<Home />} />
        {import.meta.env.DEV ? <Route path={DESIGN_ITEM.to} element={<DesignSystemPage />} /> : null}
        {SCREENS.map(({ path, roles, grants, Screen }) => (
          <Route
            key={path}
            path={path}
            element={
              <RequireRole roles={roles} grants={grants}>
                <Suspense fallback={<Loading />}>
                  <Screen />
                </Suspense>
              </RequireRole>
            }
          />
        ))}
        {ALL_ITEMS.filter((item) => !BUILT.has(item.to)).map((item) => (
          <Route
            key={item.to}
            path={item.to}
            element={
              <RequireRole roles={item.roles}>
                <PlannedPage item={item} />
              </RequireRole>
            }
          />
        ))}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  const [client] = useState(makeQueryClient)
  useSessionExpiry(client)
  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <TooltipProvider>
          <ConfirmProvider>
            <AppRoutes />
            <TaskAnnouncer />
            <Toaster position="bottom-right" />
          </ConfirmProvider>
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
