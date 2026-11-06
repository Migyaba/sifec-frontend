import { CheckCircle2, Loader2, OctagonX } from "lucide-react"
import { useEffect, useSyncExternalStore } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

import { dismiss, setAnnouncer, snapshot, subscribe, type TrackedTask } from "./tracker"

export function useTasks(): TrackedTask[] {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

/** Annonce la fin d'une tâche, où que soit la personne dans l'application. */
export function TaskAnnouncer() {
  const navigate = useNavigate()
  useEffect(() => {
    setAnnouncer((task) => {
      const action = task.href ? { label: "Ouvrir", onClick: () => navigate(task.href as string) } : undefined
      const options = { description: task.message, action, onDismiss: () => dismiss(task.id), onAutoClose: () => dismiss(task.id) }
      if (task.status === "done") toast.success(task.label, options)
      else toast.error(task.label, { ...options, duration: Infinity })
    })
    return () => setAnnouncer(() => {})
  }, [navigate])
  return null
}

/** Tâches en cours, dans la barre du haut. Rien n'est affiché quand rien ne tourne. */
export function TaskIndicator() {
  const tasks = useTasks()
  const running = tasks.filter((task) => task.status === "running")
  if (!tasks.length) return null
  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex h-9 items-center gap-2 rounded-lg px-2.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-muted hover:text-ink"
        aria-label={`${running.length} tâche(s) en cours`}
      >
        {running.length ? (
          <Loader2 className="size-4 animate-spin text-blue-600" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="size-4 text-ok" aria-hidden="true" />
        )}
        <span className="tabular hidden sm:inline">
          {running.length ? `${running.length} en cours` : "Terminées"}
        </span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-line px-3.5 py-2.5 text-sm font-bold text-ink">Tâches</div>
        <ul className="max-h-80 divide-y divide-line overflow-y-auto">
          {[...tasks].reverse().map((task) => (
            <li key={task.id} className="flex items-start gap-2.5 px-3.5 py-2.5">
              {task.status === "running" ? (
                <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-blue-600" aria-hidden="true" />
              ) : task.status === "done" ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden="true" />
              ) : (
                <OctagonX className="mt-0.5 size-4 shrink-0 text-block" aria-hidden="true" />
              )}
              <div className="min-w-0 text-[0.8125rem]">
                <div className="font-semibold text-ink">{task.label}</div>
                <div className={cn("text-xs", task.status === "failed" ? "text-block" : "text-ink-muted")}>
                  {task.status === "running" ? "En cours" : task.message}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
