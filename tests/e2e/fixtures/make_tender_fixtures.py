"""Pièces d'essai des parcours des avis (lot F2.1) et des dossiers (lot F2.2) : un avis fictif,
son additif, et une copie de l'avis pour les dossiers (une pièce identique serait un doublon).

Régénérer : uv run python tests/e2e/fixtures/make_tender_fixtures.py (depuis sifec-backend,
qui fournit pymupdf), avec le chemin de ce dossier en argument. Le texte doit rester celui que
citent les réponses préparées de tests/e2e/fake-ai.json.
"""

import sys
from pathlib import Path

import pymupdf

PAGES = {
    "Avis AMI essai.pdf": [
        [
            "AVIS A MANIFESTATION D'INTERET N° 007/2026",
            "Recrutement d'un cabinet pour l'audit des comptes du projet fictif d'eau potable.",
            "Les manifestations d'intérêt doivent être déposées au plus tard le 15 décembre 2026 à 10 heures.",
            "Article 4. Le cabinet justifie d'au moins cinq missions similaires au cours des cinq dernières années.",
        ],
        [
            "Les dossiers sont déposés en trois exemplaires dont un original, sous pli fermé.",
            "Langue de la manifestation : français.",
        ],
    ],
    "Avis AMI dossier essai.pdf": [
        [
            "AVIS A MANIFESTATION D'INTERET N° 007/2026",
            "Recrutement d'un cabinet pour l'audit des comptes du projet fictif d'eau potable.",
            "Les manifestations d'intérêt doivent être déposées au plus tard le 15 décembre 2026 à 10 heures.",
            "Article 4. Le cabinet justifie d'au moins cinq missions similaires au cours des cinq dernières années.",
        ],
        [
            "Les dossiers sont déposés en trois exemplaires dont un original, sous pli fermé.",
            "Langue de la manifestation : français.",
            "Copie d'essai pour le parcours des dossiers.",
        ],
    ],
    "Additif AMI essai.pdf": [
        [
            "ADDITIF N° 1 A L'AVIS N° 007/2026",
            "La date limite de dépôt est reportée au 22 décembre 2026 à 10 heures.",
        ],
    ],
}

folder = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent
for name, pages in PAGES.items():
    document = pymupdf.open()
    for lines in pages:
        page = document.new_page()
        for index, line in enumerate(lines):
            page.insert_text((56, 80 + index * 22), line, fontsize=10)
    document.set_metadata({"title": name.removesuffix(".pdf"), "creator": "SIFEC parcours"})
    document.save(folder / name, garbage=4, deflate=True)
    print(f"{name} : {len(pages)} page(s)")
