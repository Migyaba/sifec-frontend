import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * Code à usage unique : 6 chiffres de l'application d'authentification, ou un code de secours
 * (lettres et chiffres, jusqu'à 16 caractères).
 */
export function CodeField({
  value,
  onChange,
  recovery = false,
  invalid = false,
}: {
  value: string
  onChange: (value: string) => void
  recovery?: boolean
  invalid?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="code">{recovery ? "Code de secours" : "Code à 6 chiffres"}</Label>
      <Input
        id="code"
        name="code"
        value={value}
        onChange={(event) => onChange(event.target.value.toLowerCase().replace(/[^0-9a-z]/g, ""))}
        inputMode={recovery ? "text" : "numeric"}
        autoComplete="one-time-code"
        autoFocus
        required
        maxLength={recovery ? 16 : 6}
        aria-invalid={invalid || undefined}
        className="tabular h-11 text-center text-lg font-bold tracking-[0.3em]"
      />
    </div>
  )
}

export function isCodeComplete(value: string, recovery: boolean): boolean {
  return recovery ? value.length >= 6 : /^[0-9]{6}$/.test(value)
}
