# -*- coding: utf-8 -*-
"""
User Model: Data access layer for boxer profiles.
Follows the Repository pattern for scalability.
"""

import sqlite3
from typing import Optional, List, Dict, Any
from backend.config import USERS_DB


def _dict_factory(cursor: sqlite3.Cursor, row: tuple) -> Dict[str, Any]:
    """Convert SQLite rows to dictionaries."""
    return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}


def get_all_users() -> List[Dict[str, Any]]:
    """Retrieve all users with their injuries and performance metrics."""
    conn = sqlite3.connect(USERS_DB)
    conn.row_factory = _dict_factory
    cur = conn.cursor()
    
    cur.execute("SELECT * FROM users")
    users = cur.fetchall()
    
    for user in users:
        # Fetch injuries
        cur.execute("SELECT injury FROM injuries WHERE user_id=?", (user["id"],))
        user["injuries"] = [row["injury"] for row in cur.fetchall()]
        
        # Fetch performance metrics
        cur.execute("SELECT * FROM performance WHERE user_id=?", (user["id"],))
        perf = cur.fetchone()
        user["performance"] = perf if perf else {}
    
    conn.close()
    return users


def get_user(user_id: int) -> Optional[Dict[str, Any]]:
    """Retrieve a single user by ID."""
    conn = sqlite3.connect(USERS_DB)
    conn.row_factory = _dict_factory
    cur = conn.cursor()
    
    cur.execute("SELECT * FROM users WHERE id=?", (user_id,))
    user = cur.fetchone()
    
    if not user:
        conn.close()
        return None
    
    # Fetch injuries
    cur.execute("SELECT injury FROM injuries WHERE user_id=?", (user_id,))
    user["injuries"] = [row["injury"] for row in cur.fetchall()]
    
    # Fetch performance metrics
    cur.execute("SELECT * FROM performance WHERE user_id=?", (user_id,))
    perf = cur.fetchone()
    user["performance"] = perf if perf else {}
    
    conn.close()
    return user


def update_user_performance(user_id: int, fatigue: float, guard_accuracy: float) -> bool:
    """Update real-time performance metrics for a user."""
    conn = sqlite3.connect(USERS_DB)
    cur = conn.cursor()
    
    try:
        cur.execute("""
            UPDATE performance 
            SET current_fatigue = ?, guard_accuracy = ?, last_updated = CURRENT_TIMESTAMP
            WHERE user_id = ?
        """, (fatigue, guard_accuracy, user_id))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error updating performance: {e}")
        return False
    finally:
        conn.close()
