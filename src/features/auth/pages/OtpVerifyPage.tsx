import { Loader2 } from "lucide-react"
import { useState } from "react"
import { Navigate } from "react-router"

import { Button } from "@/components/ui/button"

import { authMessage, useLogout, useOtpVerify } from "../api"
import { AuthLayout } from "../components/AuthLayout"
import { CodeField, isCodeComplete } from "../components/CodeField"
import { FormError } from "../components/FormError"
import { useGate } from "../useGate"

export function OtpVerifyPage() {
  const { gate, target, from } = useGate()
  const verify = useOtpVerify()
  const logout = useLogout()
  const [code, setCode] = useState("")
  const [recovery, setRecovery] = useState(false)

  if (gate && gate !== "verify" && target) return <Navigate to={target} replace state={{ from }} />

  return (
    <AuthLayout
      title="Code de vérification"
      intro={
        recovery
          ? "Saisissez l'un des codes de secours reçus à l'activation. Chacun ne sert qu'une fois."
          : "Ouvrez votre application d'authentification et saisissez le code affiché pour SIFEC Offrea."
      }
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault()
          verify.mutate(code)
        }}
      >
        <FormError message={authMessage(verify.error)} />
        <CodeField value={code} onChange={setCode} recovery={recovery} invalid={Boolean(verify.error)} />
        <Button type="submit" size="lg" className="w-full" disabled={verify.isPending || !isCodeComplete(code, recovery)}>
          {verify.isPending ? <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : null}
          Vérifier le code
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="link"
            className="px-0"
            onClick={() => {
              setRecovery((value) => !value)
              setCode("")
              verify.reset()
            }}
          >
            {recovery ? "Utiliser l'application" : "Utiliser un code de secours"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => logout.mutate()}>
            Changer de compte
          </Button>
        </div>
      </form>
    </AuthLayout>
  )
}
