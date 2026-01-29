# -*- coding: utf-8 -*-
"""
Adaptation Engine: The "Brain" of the Boxing Coach.
Evaluates rules against user model and context to determine the optimal coaching phase.
"""

from typing import Dict, Any, Tuple, List, Optional
from backend.config import (
    PHASES_BY_LEVEL,
    FATIGUE_THRESHOLD_HIGH,
    FATIGUE_THRESHOLD_CRITICAL,
    GUARD_ACCURACY_THRESHOLD_LOW
)
from backend.models import get_all_rules


def evaluate_condition(condition: str, user: Dict[str, Any], context: Dict[str, Any]) -> bool:
    """
    Evaluate a string-based rule condition against user and context data.
    Supports: =, <=, >=, >, <, AND, CONTAINS, NOT_CONTAINS
    
    Example conditions:
    - "level=Débutant AND fatigue>=0.7"
    - "injuries CONTAINS Épaules"
    """
    clauses = condition.split(" AND ")
    
    for clause in clauses:
        clause = clause.strip()
        
        # Handle CONTAINS operator
        if "NOT_CONTAINS" in clause:
            key, val = clause.split("NOT_CONTAINS")
            key, val = key.strip(), val.strip()
            if val in user.get(key, []):
                return False
        elif "CONTAINS" in clause:
            key, val = clause.split("CONTAINS")
            key, val = key.strip(), val.strip()
            if val not in user.get(key, []):
                return False
        
        # Handle comparison operators
        elif ">=" in clause:
            key, val = clause.split(">=")
            key, val = key.strip(), val.strip()
            actual = _get_value(key, user, context)
            if actual is None or float(actual) < float(val):
                return False
        elif "<=" in clause:
            key, val = clause.split("<=")
            key, val = key.strip(), val.strip()
            actual = _get_value(key, user, context)
            if actual is None or float(actual) > float(val):
                return False
        elif ">" in clause:
            key, val = clause.split(">")
            key, val = key.strip(), val.strip()
            actual = _get_value(key, user, context)
            if actual is None or float(actual) <= float(val):
                return False
        elif "<" in clause:
            key, val = clause.split("<")
            key, val = key.strip(), val.strip()
            actual = _get_value(key, user, context)
            if actual is None or float(actual) >= float(val):
                return False
        elif "=" in clause:
            key, val = clause.split("=")
            key, val = key.strip(), val.strip()
            actual = _get_value(key, user, context)
            if str(actual) != val:
                return False
    
    return True


def _get_value(key: str, user: Dict[str, Any], context: Dict[str, Any]) -> Any:
    """Helper to get a value from user or context, supporting nested keys like 'performance.fatigue'."""
    if "." in key:
        parts = key.split(".")
        obj = user if parts[0] in user else context
        for part in parts:
            if isinstance(obj, dict):
                obj = obj.get(part)
            else:
                return None
        return obj
    
    if key in user:
        return user[key]
    if key in context:
        return context[key]
    return None


def apply_adaptation(adaptation: str) -> Dict[str, Any]:
    """
    Parse an adaptation string into a dictionary of actions.
    Example: "phase=Récupération;instruction=Respire profondément;intensity=low"
    """
    result = {}
    for rule in adaptation.split(";"):
        if "=" in rule:
            key, val = rule.split("=", 1)
            key, val = key.strip(), val.strip()
            # Type conversion
            if val.lower() == "true":
                result[key] = True
            elif val.lower() == "false":
                result[key] = False
            elif val.replace(".", "").isdigit():
                result[key] = float(val) if "." in val else int(val)
            else:
                result[key] = val
    return result


def adapt(user: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main adaptation function. Returns the optimal coaching response.
    
    Args:
        user: User model (level, endurance, injuries, performance)
        context: Real-time context (fatigue, space, guard_accuracy, time_remaining)
    
    Returns:
        Dict with: phase, instruction, sub_feedback, intensity, alerts
    """
    # Default response
    response = {
        "phase": "Technique",
        "instruction": "Garde haute, menton rentré",
        "sub_feedback": "Maintiens le rythme",
        "intensity": "medium",
        "alerts": []
    }
    
    level = user.get("level", "Débutant")
    allowed_phases = PHASES_BY_LEVEL.get(level, PHASES_BY_LEVEL["Débutant"])
    
    # --- HARD-CODED CRITICAL RULES (Always checked first) ---
    
    # Critical fatigue override
    fatigue = context.get("fatigue", 0)
    if fatigue >= FATIGUE_THRESHOLD_CRITICAL:
        response["phase"] = "Récupération" if "Récupération" in allowed_phases else "Correction Posturale"
        response["instruction"] = "STOP - Récupération obligatoire"
        response["sub_feedback"] = "Respire profondément, tu es au max"
        response["intensity"] = "low"
        response["alerts"].append("fatigue_critical")
        return response
    
    # Injury protection
    injuries = user.get("injuries", [])
    if "Épaules" in injuries and context.get("current_phase") == "Shadow Boxing":
        response["alerts"].append("injury_risk_shoulders")
        response["sub_feedback"] = "Évite les coups hauts, protège tes épaules"
    
    # --- DYNAMIC RULES FROM DATABASE ---
    rules = get_all_rules()
    for rule in rules:
        if evaluate_condition(rule.get("condition", ""), user, context):
            adaptation = apply_adaptation(rule.get("adaptation", ""))
            
            # Merge adaptation into response (later rules override earlier ones)
            if "phase" in adaptation and adaptation["phase"] in allowed_phases:
                response["phase"] = adaptation["phase"]
            if "instruction" in adaptation:
                response["instruction"] = adaptation["instruction"]
            if "sub_feedback" in adaptation:
                response["sub_feedback"] = adaptation["sub_feedback"]
            if "intensity" in adaptation:
                response["intensity"] = adaptation["intensity"]
    
    # --- FATIGUE-BASED ADJUSTMENTS (Applied after rules) ---
    if fatigue >= FATIGUE_THRESHOLD_HIGH and response["intensity"] != "low":
        response["intensity"] = "medium"
        response["sub_feedback"] = "Ralentis un peu, économise ton énergie"
        response["alerts"].append("fatigue_high")
    
    # Guard accuracy check
    guard_accuracy = context.get("guard_accuracy", 1.0)
    if guard_accuracy < GUARD_ACCURACY_THRESHOLD_LOW:
        if "Correction Posturale" in allowed_phases:
            response["phase"] = "Correction Posturale"
        response["sub_feedback"] = "Ta garde descend, remonte les mains !"
        response["alerts"].append("guard_low")
    
    return response
