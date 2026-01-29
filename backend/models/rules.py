# -*- coding: utf-8 -*-
"""
Rules Model: Data access layer for adaptation rules.
"""

import sqlite3
from typing import List, Dict, Any
from backend.config import RULES_DB


def _dict_factory(cursor: sqlite3.Cursor, row: tuple) -> Dict[str, Any]:
    """Convert SQLite rows to dictionaries."""
    return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}


def get_all_rules() -> List[Dict[str, Any]]:
    """Retrieve all adaptation rules from the database."""
    conn = sqlite3.connect(RULES_DB)
    conn.row_factory = _dict_factory
    cur = conn.cursor()
    
    cur.execute("SELECT * FROM rules ORDER BY priority DESC")
    rules = cur.fetchall()
    
    conn.close()
    return rules


def get_rules_by_category(category: str) -> List[Dict[str, Any]]:
    """Retrieve rules filtered by category (e.g., 'fatigue', 'injury', 'level')."""
    conn = sqlite3.connect(RULES_DB)
    conn.row_factory = _dict_factory
    cur = conn.cursor()
    
    cur.execute("SELECT * FROM rules WHERE category = ? ORDER BY priority DESC", (category,))
    rules = cur.fetchall()
    
    conn.close()
    return rules
