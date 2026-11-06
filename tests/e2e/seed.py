"""Comptes des parcours Playwright, dans la base jetable sifec_e2e (jamais la base de travail).

Lancé par scripts/e2e-backend.sh : `manage.py shell < tests/e2e/seed.py`.
"""

import os

from django.db import connection

from apps.accounts.models import User
from apps.accounts.types import Role

assert connection.settings_dict["NAME"].endswith("_e2e"), "Base de parcours attendue (…_e2e)."  # noqa: S101

PASSWORD = os.environ.get("E2E_PASSWORD", "Parcours-e2e-2026")
ACCOUNTS = [
    ("e2e-collab@sifec.test", Role.COLLABORATEUR, "Fifa", "Houngbo"),
    # Second collaborateur : vérifie ce que le premier a saisi (personne ne valide son travail).
    ("e2e-collab2@sifec.test", Role.COLLABORATEUR, "Sèna", "Dossou"),
    ("e2e-pole@sifec.test", Role.CHEF_POLE, "Aurel", "Kpadonou"),
]

for email, role, first, last in ACCOUNTS:
    User.objects.filter(email=email).delete()
    User.objects.create_user(email, PASSWORD, role=role, first_name=first, last_name=last)

print(f"{len(ACCOUNTS)} comptes de parcours prêts.")
