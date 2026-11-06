import { cn } from "@/lib/utils"

/**
 * Cadre de tout écran de l'application : toute la largeur disponible, pour les tableaux et le
 * parcours d'un dossier. Marges latérales en pourcentage de la largeur, pour suivre la taille de
 * l'écran. Les textes longs gardent leur propre limite de lecture (68 caractères).
 */
export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("w-full px-[3%] pt-8 pb-24", className)}>{children}</div>
}
