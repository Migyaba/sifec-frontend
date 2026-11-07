import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, call, type components } from "@/api"
import type { Level } from "@/components/sifec/confidence"

type S = components["schemas"]
export type Alert = S["Alert"]
export type Notification = S["Notification"]
export type AlertLevel = S["NotificationLevelEnum"]

export const LEVEL_LABEL: Record<AlertLevel, string> = { warning: "À prévoir", urgent: "Urgent", critical: "Critique" }
/** Urgence d'une alerte sur les niveaux du système : à prévoir et urgent en orange, critique en rouge. */
export const LEVEL_TONE: Record<AlertLevel, Level> = { warning: "check", urgent: "check", critical: "block" }
export const STATUS_LABEL: Record<S["AlertStatusEnum"], string> = { open: "Ouverte", treated: "Traitée", resolved: "Résolue" }

/** Écran de l'objet visé par une alerte ou une notification, quand il existe. */
export function objectLink(type: string, id: string): string | null {
  if (!id) return null
  if (type === "corporate_document") return `/pieces/${id}`
  if (type === "expert") return `/experts/${id}`
  if (type === "document") return `/documents/${id}`
  return null
}

export function useAlerts(query: Record<string, string | number>) {
  return useQuery({
    queryKey: ["alerts", "list", query],
    queryFn: () => call(api.GET("/api/v1/alerts/", { params: { query: query as never } })),
    placeholderData: keepPreviousData,
  })
}

export function useTreatAlert() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) =>
      call(api.POST("/api/v1/alerts/{id}/treat/", { params: { path: { id } }, body: { comment } })),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["alerts"] })
      void client.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}

/** Compteur des notifications non lues : relu chaque minute, et au retour sur l'onglet. */
export function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => call(api.GET("/api/v1/notifications/unread-count/")),
    refetchInterval: 60_000,
  })
}

export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => call(api.GET("/api/v1/notifications/")),
    enabled,
  })
}

export function useReadNotification() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => call(api.POST("/api/v1/notifications/{id}/read/", { params: { path: { id } } })),
    onSuccess: () => client.invalidateQueries({ queryKey: ["notifications"] }),
  })
}

export function useReadAll() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => call(api.POST("/api/v1/notifications/read-all/")),
    onSuccess: () => client.invalidateQueries({ queryKey: ["notifications"] }),
  })
}
