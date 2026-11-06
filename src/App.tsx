import { BrowserRouter, Navigate, Route, Routes } from "react-router"

import { AppShell } from "@/components/sifec/shell"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { DesignSystemPage } from "@/pages/DesignSystem"

export default function App() {
  return (
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
  )
}
