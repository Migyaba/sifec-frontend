"""Comptes des parcours Playwright, dans la base jetable sifec_e2e (jamais la base de travail).

Lancé par scripts/e2e-backend.sh : `manage.py shell < tests/e2e/seed.py`.
"""

import os
from pathlib import Path

from django.db import connection
from django_otp.plugins.otp_totp.models import TOTPDevice

from tests import files

from apps.accounts.models import User
from apps.accounts.types import Role

assert connection.settings_dict["NAME"].endswith("_e2e"), "Base de parcours attendue (…_e2e)."  # noqa: S101

PASSWORD = os.environ.get("E2E_PASSWORD", "Parcours-e2e-2026")
ACCOUNTS = [
    ("e2e-collab@sifec.test", Role.COLLABORATEUR, "Fifa", "Houngbo"),
    # Second collaborateur : vérifie ce que le premier a saisi (personne ne valide son travail).
    ("e2e-collab2@sifec.test", Role.COLLABORATEUR, "Sèna", "Dossou"),
    ("e2e-pole@sifec.test", Role.CHEF_POLE, "Aurel", "Kpadonou"),
    ("e2e-chef@sifec.test", Role.CHEF_DEPARTEMENT, "Rodrigue", "Agossou"),
]
# Chef de département à la double authentification déjà activée : le parcours calcule ses codes
# avec cette clé (tests/e2e/helpers.ts). Clé d'essai, pour la base jetable seulement.
CHEF_TOTP_KEY = "3132333435363738393031323334353637383930"

for email, role, first, last in ACCOUNTS:
    User.objects.filter(email=email).delete()
    User.objects.create_user(email, PASSWORD, role=role, first_name=first, last_name=last)

chef = User.objects.get(email="e2e-chef@sifec.test")
TOTPDevice.objects.create(user=chef, name="Parcours", key=CHEF_TOTP_KEY, confirmed=True)

# Dossier existant d'essai, pour la reprise : pièces administratives et un dossier déposé.
root = Path(os.environ["BACKFILL_ROOT"])
SAMPLES = {
    "Docs administratifs/Attestation fiscale 2025.pdf": ["ATTESTATION DE REGULARITE FISCALE\nCabinet SIFEC, IFU fictif 0000000000000."],
    "Docs administratifs/RCCM 2024.pdf": ["REGISTRE DU COMMERCE ET DU CREDIT MOBILIER\nImmatriculation fictive RB/COT/00 B 0000."],
    "Propositions/2025/AMI AUDIT FONDS FICTIF/Avis AMI 012-2025.pdf": ["AVIS A MANIFESTATION D INTERET 012-2025\nAudit des comptes du fonds fictif."],
    "Propositions/2025/AMI AUDIT FONDS FICTIF/MANIFESTATION INTERET.pdf": ["MANIFESTATION D INTERET\nLe Cabinet SIFEC presente sa candidature."],
}
for relative, pages in SAMPLES.items():
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(files.pdf(pages))

print(f"{len(ACCOUNTS)} comptes de parcours prêts, {len(SAMPLES)} fichiers à reprendre.")
