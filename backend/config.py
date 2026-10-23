"""Shared configuration for the FourthDown AI backend."""

import os
from datetime import date
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent

def current_nfl_season(today=None):
    """NFL seasons start in September; January-August belong to the previous season."""
    today = today or date.today()
    return today.year if today.month >= 9 else today.year - 1


# Season the model is evaluated on and projects for. Override with
# FOURTHDOWN_SEASON (e.g. to rebuild a past season).
SEASON = int(os.environ.get("FOURTHDOWN_SEASON") or current_nfl_season())

# Seasons used for training (all seasons < SEASON) plus the current one.
DATA_SEASONS = list(range(SEASON - 3, SEASON + 1))

SKILL_POSITIONS = ["RB", "WR", "TE"]

# Where precompute.py writes the static JSON the website reads.
STATIC_DATA_DIR = PROJECT_ROOT / "frontend" / "public" / "data"

# Allowed browser origins for the optional local FastAPI server.
CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "FOURTHDOWN_CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]
