import { Link } from "react-router"

import { MISSION_NATURE, OrganizationName, PROCEDURE, statusColumn, type RecordConfig, type RecordRow } from "@/features/records"

import { Coverage } from "./Coverage"
import { FormPreview } from "./FormPreview"

const link = (route: string, label: (row: RecordRow) => string) => (row: RecordRow) => (
  <Link to={`${route}/${row.id}`} className="font-semibold text-ink hover:text-blue-700 hover:underline">
    {label(row)}
  </Link>
)

/** Méthodologies validées : la rédaction par l'IA part toujours de l'une d'elles (H6). */
export const methodologyConfig: RecordConfig = {
  type: "methodology",
  base: "/api/v1/methodologies",
  route: "/methodologies",
  title: "Méthodologies",
  intro: "Les méthodologies validées par le Cabinet, une ou plusieurs par type de mission. Un nouveau dossier part de l'une d'elles, jamais de rien.",
  newLabel: "Nouvelle méthodologie",
  newTitle: "Nouvelle méthodologie",
  searchPlaceholder: "Intitulé, objet…",
  empty: { title: "Aucune méthodologie", hint: "Créez-en une par type de mission, à partir d'un dossier retenu." },
  name: (row) => String(row.title ?? ""),
  listTop: () => <Coverage />,
  filters: [{ key: "nature", label: "Type de mission", options: MISSION_NATURE }],
  fields: [
    { name: "title", label: "Intitulé", kind: "text", required: true, wide: true },
    { name: "nature", label: "Type de mission", kind: "select", options: MISSION_NATURE, required: true },
    { name: "donor", label: "Bailleur", kind: "organization", role: "donor", help: "Vide : valable pour tous les bailleurs." },
    { name: "summary", label: "Objet", kind: "textarea", wide: true },
    { name: "source", label: "Dossier d'origine", kind: "document", help: "Le dossier retenu dont la méthodologie est tirée." },
  ],
  sections: [
    {
      collection: "sections",
      title: "Sections",
      addLabel: "Ajouter une section",
      empty: "Aucune section : une méthodologie se découpe en sections (contexte, démarche, organisation…).",
      fields: [
        { name: "title", label: "Titre", kind: "text", required: true, wide: true },
        { name: "body", label: "Texte", kind: "textarea", required: true, wide: true },
      ],
      summary: (row) => ({ title: String(row.title ?? ""), detail: String(row.body ?? "").slice(0, 140) }),
    },
  ],
  columns: [
    { key: "title", header: "Méthodologie", wrap: true, cell: link("/methodologies", (row) => String(row.title)) },
    { key: "nature", header: "Type de mission", cell: (row) => <span className="text-ink-muted">{MISSION_NATURE[String(row.nature)]}</span> },
    { key: "donor", header: "Bailleur", secondary: true, cell: (row) => <OrganizationName id={row.donor as string} /> },
    statusColumn,
  ],
}

const SOURCE_FORMAT = { word: "Fourni en Word : extrait avec sa mise en forme", pdf: "Fourni en PDF : reproduit à la main en Word" }

/** Formulaires types des bailleurs (TECH-1, FIN-2…) : remplis d'après leurs règles, jamais fusionnés. */
export const formTemplateConfig: RecordConfig = {
  type: "form_template",
  base: "/api/v1/form-templates",
  route: "/formulaires",
  title: "Formulaires types",
  intro: "Les formulaires exigés par les bailleurs, en Word, avec les champs à remplir et leurs règles. Un formulaire reste un fichier distinct du dossier.",
  newLabel: "Nouveau formulaire",
  newTitle: "Nouveau formulaire type",
  searchPlaceholder: "Code, intitulé…",
  empty: { title: "Aucun formulaire type", hint: "Déposez le formulaire Word du bailleur, puis décrivez ses champs et ses règles." },
  name: (row) => `${String(row.code ?? "")} : ${String(row.name ?? "")}`,
  filters: [{ key: "procedure", label: "Procédure", options: PROCEDURE }],
  fields: [
    { name: "code", label: "Code", kind: "text", required: true, help: "Tel qu'il figure dans le dossier type (TECH-1, FIN-2…)." },
    { name: "name", label: "Intitulé", kind: "text", required: true },
    { name: "procedure", label: "Procédure", kind: "select", options: PROCEDURE, required: true },
    { name: "donor", label: "Bailleur", kind: "organization", role: "donor" },
    { name: "edition", label: "Édition du dossier type", kind: "text" },
    { name: "source_format", label: "Format d'origine", kind: "select", options: SOURCE_FORMAT, required: true },
    { name: "file", label: "Fichier Word du formulaire", kind: "document", required: true },
    {
      name: "expected_fields",
      label: "Champs attendus",
      kind: "json",
      wide: true,
      help: 'Liste JSON : [{"key": "nom_cabinet", "label": "Nom du cabinet"}]. Clés en minuscules, chiffres et « _ ».',
    },
    {
      name: "rules",
      label: "Règles de remplissage",
      kind: "json",
      wide: true,
      help: 'Liste JSON. Une règle reconnaît le début d\'un paragraphe et le remplit en entier (fill), le retire (delete) ou retire ses crochets : [{"pattern": "^\\\\[Nom du cabinet\\\\]", "action": "fill", "template": "{nom_cabinet}"}].',
    },
    { name: "notes", label: "Notes", kind: "textarea", wide: true },
  ],
  aside: (row) => <FormPreview templateId={row.id} expected={row.expected_fields} />,
  columns: [
    { key: "code", header: "Code", cell: link("/formulaires", (row) => String(row.code)) },
    { key: "name", header: "Intitulé", wrap: true, cell: (row) => String(row.name ?? "") },
    { key: "procedure", header: "Procédure", cell: (row) => <span className="text-ink-muted">{String(row.procedure ?? "").toUpperCase()}</span> },
    { key: "donor", header: "Bailleur", secondary: true, cell: (row) => <OrganizationName id={row.donor as string} /> },
    statusColumn,
  ],
}

const DOC_KIND = { cover: "Page de garde", letter: "Lettre", report: "Rapport, proposition", table: "Tableau (Excel)" }

/** Modèles de la charte du Cabinet : styles, marges, en-tête et pied de page des documents produits. */
export const docTemplateConfig: RecordConfig = {
  type: "doc_template",
  base: "/api/v1/doc-templates",
  route: "/modeles",
  title: "Modèles de documents",
  intro: "Les modèles Word et Excel de la charte du Cabinet. Le montage d'un dossier en reprend les styles, les marges, l'en-tête et le pied de page.",
  newLabel: "Nouveau modèle",
  newTitle: "Nouveau modèle de document",
  searchPlaceholder: "Intitulé…",
  empty: { title: "Aucun modèle de document", hint: "Sans modèle, les dossiers ont une mise en page sobre. Déposez ceux de la charte du Cabinet." },
  name: (row) => String(row.name ?? ""),
  fields: [
    { name: "name", label: "Intitulé", kind: "text", required: true },
    { name: "kind", label: "Sorte de modèle", kind: "select", options: DOC_KIND, required: true },
    { name: "file", label: "Fichier du modèle", kind: "document", required: true },
    { name: "notes", label: "Notes", kind: "textarea", wide: true },
  ],
  columns: [
    { key: "name", header: "Modèle", wrap: true, cell: link("/modeles", (row) => String(row.name)) },
    { key: "kind", header: "Sorte", cell: (row) => DOC_KIND[row.kind as keyof typeof DOC_KIND] ?? "" },
    statusColumn,
  ],
}

/** Blocs de texte réutilisables : présentation du Cabinet, engagements, formules… */
export const textBlockConfig: RecordConfig = {
  type: "text_block",
  base: "/api/v1/text-blocks",
  route: "/blocs",
  title: "Blocs de texte",
  intro: "Des textes validés, réutilisés d'un dossier à l'autre : présentation du Cabinet, démarche qualité, engagements.",
  newLabel: "Nouveau bloc",
  newTitle: "Nouveau bloc de texte",
  searchPlaceholder: "Intitulé, rubrique, texte…",
  empty: { title: "Aucun bloc de texte", hint: "Enregistrez les textes que le Cabinet reprend dans chaque dossier." },
  name: (row) => String(row.title ?? ""),
  filters: [{ key: "nature", label: "Type de mission", options: MISSION_NATURE }],
  fields: [
    { name: "title", label: "Intitulé", kind: "text", required: true },
    { name: "category", label: "Rubrique", kind: "text", required: true, help: "Présentation, qualité, engagements…" },
    { name: "nature", label: "Type de mission", kind: "select", options: MISSION_NATURE, help: "Vide : tous les types." },
    { name: "tags", label: "Mots-clés", kind: "tags" },
    { name: "body", label: "Texte", kind: "textarea", required: true, wide: true },
  ],
  columns: [
    { key: "title", header: "Bloc", wrap: true, cell: link("/blocs", (row) => String(row.title)) },
    { key: "category", header: "Rubrique", cell: (row) => <span className="text-ink-muted">{String(row.category ?? "")}</span> },
    { key: "nature", header: "Type de mission", secondary: true, cell: (row) => <span className="text-ink-muted">{MISSION_NATURE[String(row.nature)] ?? "Tous"}</span> },
    statusColumn,
  ],
}
