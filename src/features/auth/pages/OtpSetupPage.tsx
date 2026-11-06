import { useQueryClient } from "@tanstack/react-query"
import { Check, Copy, Download, Loader2, RotateCcw } from "lucide-react"
import QRCode from "qrcode"
import { useEffect, useRef, useState } from "react"
import { Navigate } from "react-router"

import { userMessage } from "@/api"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

import { authMessage, sessionKey, useLogout, useOtpConfirm, useOtpSetup } from "../api"
import { AuthLayout } from "../components/AuthLayout"
import { CodeField, isCodeComplete } from "../components/CodeField"
import { FormError } from "../components/FormError"
import { useGate } from "../useGate"

/** Clé de l'adresse otpauth://, pour la saisir à la main, par groupes de quatre. */
export function secretOf(configUrl: string): string | null {
  try {
    const secret = new URL(configUrl).searchParams.get("secret")
    return secret ? (secret.match(/.{1,4}/g) ?? [secret]).join(" ") : null
  } catch {
    return null
  }
}

function useQrImage(text: string | undefined) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    if (!text) return
    let live = true
    // Image produite dans le navigateur : l'adresse, qui contient la clé, ne part nulle part.
    QRCode.toString(text, { type: "svg", margin: 1, color: { dark: "#111827", light: "#ffffff" } })
      .then((svg) => live && setSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`))
      .catch(() => live && setSrc(null))
    return () => {
      live = false
    }
  }, [text])
  return src
}

function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [kept, setKept] = useState(false)
  const [copied, setCopied] = useState(false)
  const text = `SIFEC Offrea : codes de secours\nChaque code ne sert qu'une fois.\n\n${codes.join("\n")}\n`

  return (
    <div className="space-y-5">
      <ol className="tabular grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-xl bg-card px-5 py-4 font-bold tracking-[0.08em] text-ink ring-1 ring-line">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void navigator.clipboard?.writeText(text).then(() => setCopied(true))
          }}
        >
          {copied ? <Check data-icon="inline-start" aria-hidden="true" /> : <Copy data-icon="inline-start" aria-hidden="true" />}
          {copied ? "Copiés" : "Copier"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }))
            const link = Object.assign(document.createElement("a"), { href: url, download: "sifec-codes-de-secours.txt" })
            link.click()
            URL.revokeObjectURL(url)
          }}
        >
          <Download data-icon="inline-start" aria-hidden="true" />
          Télécharger
        </Button>
      </div>
      <label className="flex items-start gap-2.5 text-[0.8125rem]">
        <Checkbox checked={kept} onCheckedChange={(value) => setKept(value === true)} className="mt-0.5" />
        <span>J'ai conservé ces codes en lieu sûr. Ils ne seront plus affichés.</span>
      </label>
      <Button type="button" size="lg" className="w-full" disabled={!kept} onClick={onDone}>
        Accéder à l'application
      </Button>
    </div>
  )
}

export function OtpSetupPage() {
  const { gate, target, from } = useGate()
  const client = useQueryClient()
  const setup = useOtpSetup()
  const confirm = useOtpConfirm()
  const logout = useLogout()
  const [code, setCode] = useState("")
  const [finished, setFinished] = useState(false)
  const started = useRef(false)
  const qr = useQrImage(setup.data?.config_url)

  const enrolling = gate === "enroll"
  useEffect(() => {
    // Une seule demande, même quand React monte l'écran deux fois en développement.
    if (!enrolling || started.current) return
    started.current = true
    setup.mutate()
  }, [enrolling, setup])

  const codes = confirm.data?.recovery_codes
  if (codes && !finished) {
    return (
      <AuthLayout
        title="Codes de secours"
        intro="Sans votre téléphone, ces codes sont le seul moyen d'entrer. Conservez-les hors de cet ordinateur."
      >
        <RecoveryCodes
          codes={codes}
          onDone={() => {
            setFinished(true)
            void client.invalidateQueries({ queryKey: sessionKey })
          }}
        />
      </AuthLayout>
    )
  }

  if (gate && gate !== "enroll" && target) return <Navigate to={target} replace state={{ from }} />

  const secret = setup.data ? secretOf(setup.data.config_url) : null

  return (
    <AuthLayout
      title="Activer la double authentification"
      intro="Votre rôle l'exige. Une fois activée, chaque connexion demande un code affiché par votre téléphone."
    >
      <ol className="space-y-6">
        <li>
          <h2 className="text-sm font-bold text-ink">1. Installez une application d'authentification</h2>
          <p className="mt-1 text-[0.8125rem] text-ink-muted">
            Par exemple Microsoft Authenticator, Google Authenticator ou FreeOTP, sur votre téléphone.
          </p>
        </li>
        <li>
          <h2 className="text-sm font-bold text-ink">2. Scannez ce code avec l'application</h2>
          <div className="mt-3 flex items-start gap-4">
            <div className="grid size-36 shrink-0 place-items-center rounded-xl bg-card ring-1 ring-line">
              {qr ? (
                <img src={qr} alt="QR code d'activation de la double authentification" className="size-32" />
              ) : setup.isError ? (
                <RotateCcw className="size-5 text-ink-muted" aria-hidden="true" />
              ) : (
                <Loader2 className="size-5 animate-spin text-ink-muted" aria-label="Préparation du code" />
              )}
            </div>
            {secret ? (
              <div className="min-w-0 text-xs text-ink-muted">
                Impossible de scanner ? Saisissez cette clé dans l'application :
                <code className="tabular mt-1.5 block font-bold tracking-[0.08em] break-all text-ink">{secret}</code>
              </div>
            ) : null}
          </div>
          {setup.isError ? (
            <div className="mt-3 space-y-2">
              <FormError message={userMessage(setup.error)} />
              <Button type="button" variant="outline" size="sm" onClick={() => setup.mutate()}>
                Réessayer
              </Button>
            </div>
          ) : null}
        </li>
        <li>
          <h2 className="text-sm font-bold text-ink">3. Saisissez le code affiché</h2>
          <form
            className="mt-3 space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              confirm.mutate(code)
            }}
          >
            <FormError message={authMessage(confirm.error)} />
            <CodeField value={code} onChange={setCode} invalid={Boolean(confirm.error)} />
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={!setup.data || confirm.isPending || !isCodeComplete(code, false)}
            >
              {confirm.isPending ? <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : null}
              Activer
            </Button>
          </form>
        </li>
      </ol>
      <Button type="button" variant="ghost" size="sm" className="mt-6" onClick={() => logout.mutate()}>
        Changer de compte
      </Button>
    </AuthLayout>
  )
}
