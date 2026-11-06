# Design

Système visuel de SIFEC Offrea. Les jetons vivent dans `src/index.css`, la référence visible est la page `/systeme`.

## Monde

Outil de travail (mode Operate) pour le personnel du Cabinet, au bureau, en lumière du jour, pendant de longues sessions : thème clair. Les couleurs viennent du site du Cabinet (sifec.net) et du logo. La marque se reconnaît au cadre bleu nuit, au pictogramme et au nom ; le reste s'efface devant le dossier.

## Règle de couleur

Le vert et l'orange disent l'état d'une preuve (synthèse, §4.2). Hors de la marque, ils ne décorent jamais rien : un aplat vert signifie « vérifié », un aplat orange « à vérifier ».

| Rôle | Jeton | Valeur |
| --- | --- | --- |
| Action, lien, sélection | `blue-600` (`--primary`) | `#205A9A`, 7,0 sur blanc |
| Survol, appui | `blue-700`, `blue-800` | `#1B4E86`, `#173F6D` |
| Focus | `blue-500` | `#1177A8`, contour de 2 px décalé de 2 px |
| Cadre (barre latérale) | `blue-900` | `#14365E` |
| Repère actif sur le cadre | `brand-lime` | `#B3C741`, 6,5 sur le cadre |
| Fond | `ground` | `#F6F7F2`, gris tiré vers l'olive |
| Surface | `card` | `#FFFFFF` |
| Filet, filet appuyé | `line`, `line-strong` | `#E3E5DC`, `#CFD3C5` |
| Texte, texte secondaire | `ink`, `ink-muted` | `#111827`, `#4B5563` (7,0 sur le fond) |
| Vérifié | `ok`, `ok-soft`, `ok-dot` | `#4D5A0C` sur `#EEF2DA`, pastille `#8C9E1D` |
| À vérifier | `check`, `check-soft`, `check-dot` | `#9A4A0C` sur `#FDEBDD`, pastille `#F68C40` |
| Bloquant | `block`, `block-soft`, `block-dot` | `#B42318` sur `#FBE4E1`, pastille `#D92D20` |

Couleurs de marque gardées telles quelles : `brand-green` `#8C9E1D`, `brand-lime` `#B3C741`, `brand-blue` `#205A9A`, `brand-sky` `#1177A8`, `brand-orange` `#F68C40`. Le vert de marque et l'orange ne portent pas de texte sur blanc (contraste 3,0 et 2,4).

## Texte

- Nunito Sans (variable, hébergée avec l'application) pour toute l'interface ; Nunito pour le nom du produit, proche du lettrage du logo.
- Échelle fixe et serrée : 11, 12, 13, 14 (corps), 16, 20, 28 px. Titres en 800, libellés en 600 et 700.
- Chiffres à chasse fixe (`tabular`) dans les montants, les jours et les pourcentages, alignés à droite.
- Interlettrage des titres à -0,015 em, jamais sous -0,04 em. Texte courant limité à 68 caractères par ligne.

## Formes et profondeur

- Rayon de base 10 px ; panneaux 12 px ; pastilles et étiquettes 5 à 6 px ; nœuds du parcours ronds, validations en carré arrondi.
- Une seule élévation par élément : les panneaux ont un filet (`ring-1 ring-line`) et pas d'ombre ; les éléments flottants (menus, fiches de preuve) ont une ombre douce et pas de filet.
- Pas de bordure colorée épaisse sur un côté, pas de dégradé, pas de verre décoratif.

## Composants propres

- `Proof` : une valeur, son niveau, et une pastille (page de la pièce) qui ouvre la fiche de preuve : pièce, page, date d'extraction, validation.
- `ConfidenceTag` : niveau avec icône et libellé ; la couleur n'est jamais seule.
- `Missing` : MANQUANT en rouge, cadre pointillé ; une valeur absente bloque l'export.
- `Pathway` : parcours du dossier. Le document coché du logo (`ValidationGlyph`) marque les validations humaines, et elles seules ; les étapes de l'agent sont des ronds numérotés. Une validation à refaire passe en orange.
- `Deadline` : date limite et jours restants ; orange à 7 jours, rouge à 3.
- `Notice` : message en ligne, fond teinté, titre qui dit ce qui se passe, texte qui dit quoi faire.
- `AppShell` : barre latérale bleu nuit (ordinateur), même navigation dans un panneau à gauche (tablette).

Les composants shadcn/ui (`src/components/ui`) sont ajustés à ces jetons : boutons de 36 px, un seul bouton plein par écran, champs sur surface blanche.

## Voix

Français administratif clair. Les boutons nomment leur action (« Valider la fiche », « Renvoyer pour correction »). Une erreur dit le problème et la correction. Les messages ne s'excusent pas et ne félicitent pas. Jamais de tiret long.

## Mouvement

Transitions courtes (150 à 300 ms) en sortie exponentielle, sur la couleur et l'ombre seulement. Tout mouvement est coupé quand le système demande moins d'animations.
