# -*- coding: utf-8 -*-
"""
Exercise Model: Handles mini-workout exercises.
"""

import sqlite3
from typing import Optional, List, Dict, Any
from backend.config import USERS_DB


def get_exercises(category: Optional[str] = None, intensity: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Get exercises, optionally filtered by category and intensity.
    """
    conn = sqlite3.connect(USERS_DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    query = "SELECT * FROM exercises WHERE 1=1"
    params = []
    
    if category:
        query += " AND category = ?"
        params.append(category)
    
    if intensity:
        query += " AND intensity = ?"
        params.append(intensity)
    
    cur.execute(query, params)
    exercises = [dict(row) for row in cur.fetchall()]
    conn.close()
    
    return exercises


def get_targeted_exercises(weakness: str) -> List[Dict[str, Any]]:
    """
    Get exercises targeting a specific weakness.
    Maps weakness types to exercise categories/types.
    """
    # Mapping of weaknesses to exercise categories
    weakness_map = {
        "guard_low": ["technique", "core"],
        "slow_jab": ["technique", "strength"],
        "poor_stance": ["technique", "strength"],
        "low_endurance": ["warmup", "recovery"],
        "fatigue": ["recovery"],
    }
    
    categories = weakness_map.get(weakness, ["general"])
    
    conn = sqlite3.connect(USERS_DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    placeholders = ",".join("?" * len(categories))
    cur.execute(f"""
        SELECT * FROM exercises 
        WHERE category IN ({placeholders})
        LIMIT 3
    """, categories)
    
    exercises = [dict(row) for row in cur.fetchall()]
    conn.close()
    
    return exercises
