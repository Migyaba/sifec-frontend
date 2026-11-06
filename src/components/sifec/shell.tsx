import { Bell, ChevronsUpDown, LogOut, Menu, Search } from "lucide-react"
import { useState } from "react"
import { NavLink } from "react-router"

import { navFor, type NavGroup } from "@/app/navigation"
import { initials, ROLE_LABEL, type SessionUser } from "@/app/roles"
import { BrandMark, Wordmark } from "@/components/sifec/brand"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

function UserMenu({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-700 text-xs font-bold text-white">
          {initials(user)}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[0.8125rem] font-semibold text-white">{user.full_name || user.email}</span>
          <span className="block text-2xs text-blue-200/80">{ROLE_LABEL[user.role]}</span>
        </span>
        <ChevronsUpDown className="size-4 text-blue-200/70" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-xs text-ink-muted">Connecté en tant que</span>
          <span className="block truncate text-sm font-semibold text-ink">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onLogout}>
          <LogOut aria-hidden="true" />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SidebarContent({
  groups,
  user,
  onLogout,
  onNavigate,
}: {
  groups: NavGroup[]
  user: SessionUser
  onLogout: () => void
  onNavigate?: () => void
}) {
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
        {groups.map((group, i) => (
          <div key={group.title ?? i}>
            {group.title ? <div className="px-2.5 pb-1.5 text-2xs font-bold text-blue-200/70">{group.title}</div> : null}
            <ul className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "group relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[0.8125rem] font-semibold transition-colors duration-200",
                        isActive ? "bg-white/10 text-white" : "text-sidebar-foreground/85 hover:bg-white/5 hover:text-white",
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
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-sidebar-border px-3 py-3">
        <UserMenu user={user} onLogout={onLogout} />
      </div>
    </>
  )
}

/** Sur tablette, la même navigation dans un panneau. */
function MobileNav(props: { groups: NavGroup[]; user: SessionUser; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
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
        <SidebarContent {...props} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}

export function AppShell({
  user,
  onLogout,
  children,
}: {
  user: SessionUser
  onLogout: () => void
  children: React.ReactNode
}) {
  const groups = navFor(user.role, { withDesign: import.meta.env.DEV })
  const canSearch = user.role !== "admin_technique"
  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <SidebarContent groups={groups} user={user} onLogout={onLogout} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-line bg-ground/90 px-6 backdrop-blur-sm">
          <MobileNav groups={groups} user={user} onLogout={onLogout} />
          <div className="hidden items-center gap-2 sm:flex lg:hidden">
            <BrandMark className="size-7" />
            <Wordmark />
          </div>
          {canSearch ? (
            <label className="relative ml-auto w-full max-w-md lg:ml-0">
              <span className="sr-only">Rechercher</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
              <input
                type="search"
                placeholder="Rechercher un avis, un expert, une pièce…"
                className="h-9 w-full rounded-lg border border-line-strong bg-card pr-3 pl-9 text-sm placeholder:text-ink-muted focus-visible:border-blue-500 focus-visible:ring-3 focus-visible:ring-blue-500/25 focus-visible:outline-none"
              />
            </label>
          ) : null}
          <button
            type="button"
            className="relative ml-auto grid size-9 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-muted hover:text-ink"
            aria-label="Alertes"
          >
            <Bell className="size-[1.125rem]" aria-hidden="true" />
          </button>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
