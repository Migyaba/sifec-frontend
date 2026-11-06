import type { components } from "@/api"

export type Role = components["schemas"]["UserRoleEnum"]
export type SessionUser = components["schemas"]["User"]

export const ROLE_LABEL: Record<Role, string> = {
  chef_departement: "Chef de département",
  chef_pole: "Chef de pôle",
  collaborateur: "Collaborateur",
  admin_technique: "Administrateur technique",
}

/**
 * Rôles qui voient le contenu des dossiers et de la base. L'administrateur technique gère les
 * comptes, sans accès au contenu.
 */
export const CONTENT: Role[] = ["chef_departement", "chef_pole", "collaborateur"]
export const SUPERVISORS: Role[] = ["chef_departement", "chef_pole"]
export const EVERYONE: Role[] = [...CONTENT, "admin_technique"]

export function hasRole(user: Pick<SessionUser, "role" | "is_active"> | undefined, roles: Role[]): boolean {
  return Boolean(user?.is_active && roles.includes(user.role))
}

export function initials(user: Pick<SessionUser, "first_name" | "last_name" | "email">): string {
  const letters = [user.first_name, user.last_name].map((part) => part.trim().charAt(0)).join("")
  return (letters || user.email.charAt(0)).toUpperCase()
}
