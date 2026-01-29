# -*- coding: utf-8 -*-
"""
Session Model: Handles session tracking and daily credit limits.
"""

import sqlite3
from datetime import date
from backend.config import USERS_DB


def get_today_session_count(user_id: int) -> int:
    """Get the number of sessions the user has done today."""
    conn = sqlite3.connect(USERS_DB)
    cur = conn.cursor()
    
    today = date.today().isoformat()
    
    cur.execute("""
        SELECT COUNT(*) FROM sessions 
        WHERE user_id = ? AND session_date = ?
    """, (user_id, today))
    
    count = cur.fetchone()[0]
    conn.close()
    
    return count


def create_session(user_id: int, mood: str = "Normal") -> int:
    """
    Create a new session record.
    Returns the session ID.
    """
    conn = sqlite3.connect(USERS_DB)
    cur = conn.cursor()
    
    today = date.today().isoformat()
    
    cur.execute("""
        INSERT INTO sessions (user_id, session_date, mood)
        VALUES (?, ?, ?)
    """, (user_id, today, mood))
    
    session_id = cur.lastrowid
    conn.commit()
    conn.close()
    
    return session_id


def update_session_score(session_id: int, score: int) -> bool:
    """Update the score for a completed session."""
    conn = sqlite3.connect(USERS_DB)
    cur = conn.cursor()
    
    try:
        cur.execute("""
            UPDATE sessions SET score = ? WHERE id = ?
        """, (score, session_id))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error updating session score: {e}")
        return False
    finally:
        conn.close()


def get_user_sessions(user_id: int, limit: int = 10) -> list:
    """Get recent sessions for a user."""
    conn = sqlite3.connect(USERS_DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    cur.execute("""
        SELECT * FROM sessions 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
    """, (user_id, limit))
    
    sessions = [dict(row) for row in cur.fetchall()]
    conn.close()
    
    return sessions
