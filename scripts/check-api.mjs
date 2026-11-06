// Vérifie que src/api/schema.d.ts correspond au schéma OpenAPI du backend.
// Une dérive fait échouer l'intégration continue : relancer `npm run api`.
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const schema = process.env.SIFEC_SCHEMA ?? "../sifec-backend/openapi/schema.yml"
const committed = "src/api/schema.d.ts"
const dir = mkdtempSync(join(tmpdir(), "sifec-api-"))
const fresh = join(dir, "schema.d.ts")

try {
  execFileSync(
    "npx",
    ["-y", "-p", "typescript@5.9.3", "-p", "openapi-typescript@7.13.0", "openapi-typescript", schema, "-o", fresh],
    { stdio: ["ignore", "ignore", "inherit"] },
  )
  if (readFileSync(fresh, "utf8") !== readFileSync(committed, "utf8")) {
    console.error(`${committed} ne correspond plus à ${schema}. Lancer \`npm run api\` et vérifier la compilation.`)
    process.exit(1)
  }
  console.log("Client de l'API à jour.")
} finally {
  rmSync(dir, { recursive: true, force: true })
}
