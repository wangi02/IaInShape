# -*- coding: utf-8 -*-
"""
Configuration module for the Boxing Coach Backend.
Centralizes all constants and paths for scalability.
"""

import os

# --- Paths ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

USERS_DB = os.path.join(DATA_DIR, "users.db")
RULES_DB = os.path.join(DATA_DIR, "rules.db")

# --- Application Constants ---
APP_NAME = "IA InShape - Boxing Coach API"
API_VERSION = "v1"
DEBUG_MODE = True

# --- Boxing Domain Constants ---
LEVELS = ("Débutant", "Avancé")
PHASES = ("Échauffement", "Technique", "Shadow Boxing", "Correction Posturale", "Récupération")

# Phases allowed per level (Adaptation Rule)
PHASES_BY_LEVEL = {
    "Débutant": ["Échauffement", "Technique", "Correction Posturale"],
    "Avancé": ["Échauffement", "Technique", "Shadow Boxing", "Correction Posturale", "Récupération"]
}

# --- Thresholds for Adaptation ---
FATIGUE_THRESHOLD_HIGH = 0.7  # Above this, suggest recovery
FATIGUE_THRESHOLD_CRITICAL = 0.9  # Force recovery
GUARD_ACCURACY_THRESHOLD_LOW = 0.5  # Below this, switch to Correction Posturale
