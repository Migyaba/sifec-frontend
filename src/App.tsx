import { QueryClientProvider, type QueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router"

import { makeQueryClient, onUnauthorized } from "@/api"
import { ALL_ITEMS, DESIGN_ITEM, homeFor } from "@/app/navigation"
import { hasRole, type Role } from "@/app/roles"
import { ConfirmProvider } from "@/components/confirm"
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

function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { data } = useSession()
  return hasRole(data?.user, roles) ? children : <ForbiddenPage />
}

function Shell() {
  const logout = useLogout()
  return (
    <RequireSession>
      {(session: Session) => (
        <AppShell user={session.user} onLogout={() => logout.mutate()}>
          <Outlet />
        </AppShell>
      )}
    </RequireSession>
  )
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
        {ALL_ITEMS.map((item) => (
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
