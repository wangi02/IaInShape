# -*- coding: utf-8 -*-
"""
Database Initialization Script for IA InShape Boxing Coach.
Creates and seeds the SQLite databases with boxing-specific data.
"""

import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

USERS_DB = os.path.join(DATA_DIR, "users.db")
RULES_DB = os.path.join(DATA_DIR, "rules.db")


def init_rules_db():
    """Initialize the rules database with boxing adaptation rules."""
    conn = sqlite3.connect(RULES_DB)
    cur = conn.cursor()
    
    cur.execute("DROP TABLE IF EXISTS rules")
    cur.execute("""
    CREATE TABLE rules (
        rule_id INTEGER PRIMARY KEY,
        category TEXT NOT NULL,
        priority INTEGER DEFAULT 0,
        condition TEXT NOT NULL,
        adaptation TEXT NOT NULL,
        description TEXT
    )
    """)
    
    # Boxing Adaptation Rules (higher priority = applied first)
    rules = [
        # --- Level-based rules ---
        ("level", 10, "level=Débutant",
         "phase=Technique;instruction=Jab simple, focus précision;intensity=low",
         "Beginners start with basic technique"),
        
        ("level", 10, "level=Avancé",
         "phase=Shadow Boxing;instruction=Enchaînements libres;intensity=high",
         "Advanced users get more freedom"),
        
        # --- Fatigue-based rules ---
        ("fatigue", 20, "fatigue>=0.7 AND fatigue<0.9",
         "phase=Correction Posturale;instruction=Ralentis le rythme;sub_feedback=Économise ton énergie;intensity=medium",
         "High fatigue triggers posture correction"),
        
        ("fatigue", 30, "fatigue>=0.9",
         "phase=Récupération;instruction=STOP - Respire;sub_feedback=Tu es à la limite;intensity=low",
         "Critical fatigue forces recovery"),
        
        # --- Injury-based rules ---
        ("injury", 25, "injuries CONTAINS Épaules",
         "instruction=Évite les uppercuts;sub_feedback=Protège tes épaules",
         "Shoulder injury adaptation"),
        
        ("injury", 25, "injuries CONTAINS Genoux",
         "instruction=Réduis les déplacements;sub_feedback=Pivote sur place",
         "Knee injury adaptation"),
        
        ("injury", 25, "injuries CONTAINS Dos",
         "instruction=Garde le dos droit;sub_feedback=Pas de rotation brusque",
         "Back injury adaptation"),
        
        ("injury", 25, "injuries CONTAINS Poignets",
         "instruction=Coups légers uniquement;sub_feedback=Ne force pas l'impact",
         "Wrist injury adaptation"),
        
        # --- Guard accuracy rules ---
        ("guard", 15, "guard_accuracy<0.5",
         "phase=Correction Posturale;instruction=GARDE HAUTE !;sub_feedback=Tes mains descendent trop",
         "Low guard accuracy triggers correction"),
        
        # --- Space-based rules ---
        ("space", 10, "space=Limité",
         "instruction=Travail sur place;sub_feedback=Adapte-toi à l'espace",
         "Limited space adaptation"),
        
        # --- Time-based rules ---
        ("time", 15, "time_remaining<=30",
         "phase=Récupération;instruction=Fin de session;sub_feedback=Étirements et respiration",
         "End of session cooldown"),
        
        # --- Endurance-based rules ---
        ("endurance", 5, "endurance<=30",
         "intensity=low;sub_feedback=On y va doucement",
         "Low endurance users get lower intensity"),
        
        ("endurance", 5, "endurance>=80",
         "intensity=high;sub_feedback=Tu peux donner plus !",
         "High endurance users get pushed harder"),
    ]
    
    cur.executemany("""
        INSERT INTO rules (category, priority, condition, adaptation, description) 
        VALUES (?, ?, ?, ?, ?)
    """, rules)
    
    conn.commit()
    conn.close()
    print(f"[OK] rules.db initialized with {len(rules)} boxing rules")


def init_users_db():
    """Initialize the users database with sample boxer profiles."""
    conn = sqlite3.connect(USERS_DB)
    cur = conn.cursor()
    
    # Drop existing tables
    cur.execute("DROP TABLE IF EXISTS users")
    cur.execute("DROP TABLE IF EXISTS injuries")
    cur.execute("DROP TABLE IF EXISTS performance")
    
    # Create users table
    cur.execute("""
    CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        level TEXT NOT NULL,
        endurance INTEGER DEFAULT 50
    )
    """)
    
    # Create injuries table (one-to-many)
    cur.execute("""
    CREATE TABLE injuries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        injury TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """)
    
    # Create performance table (real-time metrics)
    cur.execute("""
    CREATE TABLE performance (
        user_id INTEGER PRIMARY KEY,
        current_fatigue REAL DEFAULT 0.0,
        guard_accuracy REAL DEFAULT 1.0,
        total_sessions INTEGER DEFAULT 0,
        avg_session_duration INTEGER DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """)
    
    # Create sessions table (daily tracking for 3/day limit)
    cur.execute("""
    CREATE TABLE sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        session_date DATE NOT NULL,
        mood TEXT DEFAULT 'Normal',
        score INTEGER DEFAULT 0,
        duration_seconds INTEGER DEFAULT 30,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """)
    
    # Create exercises table for mini-workouts
    cur.execute("""
    CREATE TABLE exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        image_url TEXT,
        category TEXT DEFAULT 'general',
        intensity TEXT DEFAULT 'medium',
        duration_seconds INTEGER DEFAULT 30
    )
    """)
    
    # Seed exercises
    exercises = [
        ("Jumping Jacks", "20 repetitions", "/static/img/jumping_jacks.png", "warmup", "medium", 30),
        ("Etirements bras", "Tenir 15 secondes chaque bras", "/static/img/arm_stretch.png", "warmup", "low", 30),
        ("Rotations cou", "10 dans chaque sens", "/static/img/neck_rotation.png", "warmup", "low", 20),
        ("Pompes murales", "10 repetitions", "/static/img/wall_pushups.png", "strength", "low", 30),
        ("Squats", "15 repetitions", "/static/img/squats.png", "strength", "medium", 45),
        ("Planche", "Tenir 20 secondes", "/static/img/plank.png", "core", "medium", 20),
        ("Shadow Jab", "30 jabs lents", "/static/img/shadow_jab.png", "technique", "low", 30),
        ("Respiration profonde", "5 cycles inspir-expir", "/static/img/breathing.png", "recovery", "low", 60),
    ]
    cur.executemany("""
        INSERT INTO exercises (name, description, image_url, category, intensity, duration_seconds)
        VALUES (?, ?, ?, ?, ?, ?)
    """, exercises)
    
    # Sample users (as per project requirements: 5 pre-registered profiles)
    users = [
        (1, "Sébastien", "Avancé", 85),
        (2, "Camille", "Débutant", 40),
        (3, "Jordan", "Avancé", 70),
        (4, "Marie", "Débutant", 55),
        (5, "Alex", "Avancé", 90),
    ]
    cur.executemany("INSERT INTO users (id, name, level, endurance) VALUES (?, ?, ?, ?)", users)
    
    # Sample injuries
    injuries = [
        (2, "Épaules"),  # Camille has shoulder issues
        (3, "Genoux"),   # Jordan has knee issues
        (4, "Poignets"), # Marie has wrist issues
    ]
    cur.executemany("INSERT INTO injuries (user_id, injury) VALUES (?, ?)", injuries)
    
    # Initialize performance records for all users
    for user in users:
        cur.execute("""
            INSERT INTO performance (user_id, current_fatigue, guard_accuracy, total_sessions)
            VALUES (?, 0.0, 1.0, 0)
        """, (user[0],))
    
    conn.commit()
    conn.close()
    print(f"[OK] users.db initialized with {len(users)} boxer profiles")


def main():
    """Run full database initialization."""
    print("[INIT] Initializing IA InShape Database...")
    print(f"[PATH] Data directory: {DATA_DIR}")
    init_rules_db()
    init_users_db()
    print("\n[OK] Database initialization complete!")
    print("You can now start the API with: python -m backend.app")


if __name__ == "__main__":
    main()
