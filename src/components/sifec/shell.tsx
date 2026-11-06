import {
  Bell,
  BookOpen,
  BriefcaseBusiness,
  ClipboardCheck,
  FileStack,
  FolderClock,
  Gauge,
  Landmark,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  SwatchBook,
  Users,
} from "lucide-react"
import { Menu } from "lucide-react"
import { useState } from "react"
import { NavLink, useLocation } from "react-router"

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

import { BrandMark, Wordmark } from "@/components/sifec/brand"
import { cn } from "@/lib/utils"

type Item = { to: string; label: string; icon: typeof Gauge; count?: number }

const NAV: { title?: string; items: Item[] }[] = [
  {
    items: [
      { to: "/tableau-de-bord", label: "Tableau de bord", icon: Gauge },
      { to: "/dossiers", label: "Avis et dossiers", icon: BriefcaseBusiness },
      { to: "/validations", label: "Validations", icon: ClipboardCheck, count: 3 },
    ],
  },
  {
    title: "Base documentaire",
    items: [
      { to: "/documents", label: "Documents", icon: FileStack },
      { to: "/experts", label: "Experts", icon: Users },
      { to: "/references", label: "Références", icon: Landmark },
      { to: "/pieces", label: "Pièces administratives", icon: ShieldCheck },
      { to: "/anciens-dossiers", label: "Dossiers antérieurs", icon: FolderClock },
    ],
  },
  {
    title: "Bibliothèque",
    items: [
      { to: "/methodologies", label: "Méthodologies et modèles", icon: BookOpen },
      { to: "/journal", label: "Journal des actions", icon: ScrollText },
    ],
  },
  {
    title: "Administration",
    items: [
      { to: "/parametres", label: "Paramètres", icon: Settings },
      { to: "/systeme", label: "Système de design", icon: SwatchBook },
    ],
  },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="flex h-16 items-center gap-2.5 px-5">
        <BrandMark className="size-8" />
        <div className="flex flex-col gap-1">
          <Wordmark tone="dark" />
          <span className="text-[0.625rem] font-bold tracking-[0.14em] text-blue-200/80">AMI ET DDP</span>
        </div>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3" aria-label="Navigation principale">
        {NAV.map((group, i) => (
          <div key={group.title ?? i}>
            {group.title ? (
              <div className="px-2.5 pb-1.5 text-2xs font-bold text-blue-200/70">{group.title}</div>
            ) : null}
            <ul className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon, count }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "group relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[0.8125rem] font-semibold transition-colors duration-200",
                        isActive
                          ? "bg-white/10 text-white"
                          : "text-sidebar-foreground/85 hover:bg-white/5 hover:text-white",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          aria-hidden="true"
                          className={cn(
                            "absolute top-2 bottom-2 left-0 w-[3px] rounded-r-full bg-brand-lime transition-opacity",
                            isActive ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <Icon className={cn("size-4", isActive ? "text-brand-lime" : "text-blue-200/80")} aria-hidden="true" />
                        <span className="flex-1 truncate">{label}</span>
                        {count ? (
                          <span className="tabular grid h-5 min-w-5 place-items-center rounded-full bg-brand-lime px-1.5 text-2xs font-extrabold text-blue-950">
                            {count}
                          </span>
                        ) : null}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="flex items-center gap-3 border-t border-sidebar-border px-5 py-4">
        <span className="grid size-8 place-items-center rounded-full bg-blue-700 text-xs font-bold text-white">AK</span>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[0.8125rem] font-semibold text-white">A. Kpadonou</div>
          <div className="text-2xs text-blue-200/80">Chef de pôle</div>
        </div>
      </div>
    </>
  )
}

function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
      <SidebarContent />
    </aside>
  )
}

/** Sur tablette, la même navigation dans un panneau. */
function MobileNav() {
  const [open, setOpen] = useState(false)
  useLocation()
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="grid size-9 place-items-center rounded-lg text-ink transition-colors hover:bg-muted lg:hidden"
        aria-label="Ouvrir la navigation"
      >
        <Menu className="size-5" aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col gap-0 border-0 bg-sidebar p-0 text-sidebar-foreground">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SidebarContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}

function Topbar() {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-line bg-ground/90 px-6 backdrop-blur-sm">
      <MobileNav />
      <div className="hidden items-center gap-2 sm:flex lg:hidden">
        <BrandMark className="size-7" />
        <Wordmark />
      </div>
      <label className="relative ml-auto w-full max-w-md lg:ml-0">
        <span className="sr-only">Rechercher</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
        <input
          type="search"
          placeholder="Rechercher un avis, un expert, une pièce…"
          className="h-9 w-full rounded-lg border border-line-strong bg-card pr-3 pl-9 text-sm placeholder:text-ink-muted focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-500/25"
        />
      </label>
      <button
        type="button"
        className="relative ml-auto grid size-9 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-muted hover:text-ink"
        aria-label="Alertes, 4 ouvertes"
      >
        <Bell className="size-[1.125rem]" aria-hidden="true" />
        <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-block-dot ring-2 ring-ground" />
      </button>
    </header>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
