import { Bell, CheckCheck } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router"

import { userMessage } from "@/api"
import { ConfidenceTag } from "@/components/sifec/confidence"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

import { LEVEL_LABEL, LEVEL_TONE, objectLink, useNotifications, useReadAll, useReadNotification, useUnreadCount } from "./api"

const when = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

/**
 * Notifications de la personne (UC15) : nombre de non lues sur la cloche, liste au clic. Ouvrir une
 * notification la marque comme lue et mène à son objet. Le détail reste dans l'outil : le courriel
 * ne porte que le titre (plan, §5.3).
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const unread = useUnreadCount()
  const list = useNotifications(open)
  const read = useReadNotification()
  const readAll = useReadAll()
  const count = unread.data?.unread ?? 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="relative grid size-9 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-muted hover:text-ink"
        aria-label={count ? `Notifications, ${count} non lue(s)` : "Notifications"}
      >
        <Bell className="size-[1.125rem]" aria-hidden="true" />
        {count ? (
          <span className="tabular absolute -top-0.5 -right-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-block-dot px-1 text-2xs font-extrabold text-white ring-2 ring-ground">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,90vw)] p-0">
        <div className="flex items-center justify-between gap-2 border-b border-line px-3.5 py-2.5">
          <span className="text-sm font-bold text-ink">Notifications</span>
          {count ? (
            <Button variant="ghost" size="sm" onClick={() => readAll.mutate()} disabled={readAll.isPending}>
              <CheckCheck data-icon="inline-start" aria-hidden="true" />
              Tout marquer comme lu
            </Button>
          ) : null}
        </div>
        {list.isError ? <p className="px-3.5 py-3 text-xs text-block">{userMessage(list.error)}</p> : null}
        {list.data && !list.data.results.length ? <p className="px-3.5 py-6 text-center text-[0.8125rem] text-ink-muted">Aucune notification.</p> : null}
        <ul className="max-h-96 divide-y divide-line overflow-y-auto" aria-label="Dernières notifications">
          {(list.data?.results ?? []).map((item) => {
            const link = objectLink(item.object_type, item.object_id)
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={cn("flex w-full flex-col items-start gap-1 px-3.5 py-2.5 text-left hover:bg-muted", !item.read_at && "bg-blue-50/60")}
                  onClick={() => {
                    if (!item.read_at) read.mutate(item.id)
                    if (link) {
                      setOpen(false)
                      navigate(link)
                    }
                  }}
                >
                  <span className="flex w-full items-center gap-2">
                    {!item.read_at ? <span className="size-2 shrink-0 rounded-full bg-blue-600" aria-label="Non lue" /> : null}
                    <span className="min-w-0 flex-1 text-[0.8125rem] font-semibold text-ink">{item.title}</span>
                    <ConfidenceTag level={LEVEL_TONE[item.level]}>{LEVEL_LABEL[item.level]}</ConfidenceTag>
                  </span>
                  {item.body ? <span className="text-xs text-ink-muted">{item.body}</span> : null}
                  <span className="text-2xs text-ink-muted">{when.format(new Date(item.created_at))}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
