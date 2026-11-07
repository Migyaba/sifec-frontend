import {
  BookOpen,
  Building2,
  BriefcaseBusiness,
  ClipboardCheck,
  Coins,
  FileSpreadsheet,
  LayoutTemplate,
  TextQuote,
  DatabaseBackup,
  FileStack,
  FlaskConical,
  FolderClock,
  Gauge,
  Landmark,
  ScrollText,
  Settings,
  ShieldCheck,
  SwatchBook,
  UserCog,
  Users,
} from "lucide-react"

import { CONTENT, EVERYONE, SUPERVISORS, type Role } from "./roles"

export type NavItem = {
  to: string
  label: string
  icon: typeof Gauge
  roles: Role[]
  /** Lot du plan de l'interface qui construit l'écran. */
  lot: string
}

export type NavGroup = { title?: string; items: NavItem[] }

/** Les rôles reprennent les politiques du backend ; le serveur reste juge. */
export const NAV: NavGroup[] = [
  {
    items: [
      { to: "/tableau-de-bord", label: "Tableau de bord", icon: Gauge, roles: CONTENT, lot: "F1.7" },
      { to: "/dossiers", label: "Avis et dossiers", icon: BriefcaseBusiness, roles: CONTENT, lot: "F2.2" },
      { to: "/validations", label: "Validations", icon: ClipboardCheck, roles: CONTENT, lot: "F2.2" },
    ],
  },
  {
    title: "Base documentaire",
    items: [
      { to: "/documents", label: "Documents", icon: FileStack, roles: CONTENT, lot: "F1.1" },
      { to: "/experts", label: "Experts", icon: Users, roles: CONTENT, lot: "F1.3" },
      { to: "/references", label: "Références", icon: Landmark, roles: CONTENT, lot: "F1.3" },
      { to: "/pieces", label: "Pièces administratives", icon: ShieldCheck, roles: CONTENT, lot: "F1.3" },
      { to: "/anciens-dossiers", label: "Dossiers antérieurs", icon: FolderClock, roles: CONTENT, lot: "F1.3" },
      { to: "/institutions", label: "Fiches institutionnelles", icon: Building2, roles: CONTENT, lot: "F1.3" },
      { to: "/reprise", label: "Reprise de la base", icon: DatabaseBackup, roles: SUPERVISORS, lot: "F1.5" },
    ],
  },
  {
    title: "Bibliothèque",
    items: [
      { to: "/methodologies", label: "Méthodologies", icon: BookOpen, roles: CONTENT, lot: "F1.6" },
      { to: "/formulaires", label: "Formulaires types", icon: FileSpreadsheet, roles: CONTENT, lot: "F1.6" },
      { to: "/modeles", label: "Modèles de documents", icon: LayoutTemplate, roles: CONTENT, lot: "F1.6" },
      { to: "/blocs", label: "Blocs de texte", icon: TextQuote, roles: CONTENT, lot: "F1.6" },
      { to: "/tarification", label: "Tarification", icon: Coins, roles: ["chef_departement"], lot: "F1.6" },
      { to: "/recette", label: "Banc de recette", icon: FlaskConical, roles: SUPERVISORS, lot: "F2.8" },
    ],
  },
  {
    title: "Administration",
    items: [
      { to: "/comptes", label: "Comptes et rôles", icon: UserCog, roles: ["admin_technique"], lot: "F1.8" },
      { to: "/parametres", label: "Paramètres", icon: Settings, roles: ["chef_departement"], lot: "F1.8" },
      {
        to: "/journal",
        label: "Journal des actions",
        icon: ScrollText,
        roles: ["chef_departement", "admin_technique"],
        lot: "F1.8",
      },
    ],
  },
]

/** Page de référence du système de design, montrée en développement seulement. */
export const DESIGN_ITEM: NavItem = {
  to: "/systeme",
  label: "Système de design",
  icon: SwatchBook,
  roles: EVERYONE,
  lot: "F0.1",
}

export const ALL_ITEMS: NavItem[] = NAV.flatMap((group) => group.items)

export function navFor(role: Role, { withDesign = false } = {}): NavGroup[] {
  const groups = NAV.map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(role)) }))
  if (withDesign) groups.push({ title: "Développement", items: [DESIGN_ITEM] })
  return groups.filter((group) => group.items.length > 0)
}

/** Première page d'un rôle après la connexion. */
export function homeFor(role: Role): string {
  return navFor(role)[0]?.items[0]?.to ?? DESIGN_ITEM.to
}
