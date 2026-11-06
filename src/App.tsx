import { QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Navigate, Route, Routes } from "react-router"

import { makeQueryClient } from "@/api"
import { AppShell } from "@/components/sifec/shell"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { DesignSystemPage } from "@/pages/DesignSystem"

const queryClient = makeQueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TooltipProvider>
        <AppShell>
          <Routes>
            <Route path="/systeme" element={<DesignSystemPage />} />
            <Route path="*" element={<Navigate to="/systeme" replace />} />
          </Routes>
        </AppShell>
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </BrowserRouter>
    </QueryClientProvider>
  )
}
