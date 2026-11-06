import { cn } from "@/lib/utils"

/** Pictogramme du logo fourni par le Cabinet (document coché, soleil). */
export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src="/brand/sifec-offrea-mark.png"
      alt=""
      aria-hidden="true"
      className={cn("size-8 shrink-0 rounded-[22%]", className)}
    />
  )
}

/**
 * Nom du produit, dans les couleurs du logo. Sur fond sombre, « offrea »
 * passe en blanc : le bleu du logo n'y serait pas lisible.
 */
export function Wordmark({
  tone = "light",
  className,
}: {
  tone?: "light" | "dark"
  className?: string
}) {
  return (
    <span
      className={cn(
        "font-brand text-[1.0625rem] leading-none font-extrabold tracking-[-0.02em]",
        className,
      )}
    >
      <span className={tone === "dark" ? "text-brand-lime" : "text-brand-green"}>sifec</span>{" "}
      <span className={tone === "dark" ? "text-white" : "text-brand-blue"}>offrea</span>
    </span>
  )
}
