import { BrandMark, Wordmark } from "@/components/sifec/brand"

/** Cadre des écrans de connexion : la marque à gauche, le formulaire à droite. */
export function AuthLayout({
  title,
  intro,
  children,
}: {
  title: string
  intro?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-svh grid-rows-[auto_1fr] lg:grid-cols-[minmax(22rem,30rem)_1fr] lg:grid-rows-none">
      <aside className="flex flex-col justify-between bg-sidebar px-8 py-6 text-sidebar-foreground lg:px-12 lg:py-12">
        <div className="flex items-center gap-3">
          <BrandMark className="size-10" />
          <div className="flex flex-col gap-1.5">
            <Wordmark tone="dark" className="text-xl" />
            <span className="text-[0.625rem] font-bold tracking-[0.14em] text-blue-200/80">AMI ET DDP</span>
          </div>
        </div>
        <p className="mt-10 hidden max-w-[30ch] text-2xl leading-snug font-bold text-white lg:block">
          Préparer les dossiers du Cabinet, chaque valeur avec sa pièce source.
        </p>
        <p className="mt-6 hidden text-xs text-blue-200/80 lg:block">Accès réservé au personnel du Cabinet SIFEC.</p>
      </aside>
      <main className="flex items-start justify-center px-6 py-12 lg:items-center">
        <div className="w-full max-w-[24rem]">
          <h1 className="text-2xl font-extrabold text-ink">{title}</h1>
          {intro ? <div className="mt-2 text-[0.9375rem] text-ink-muted">{intro}</div> : null}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  )
}
