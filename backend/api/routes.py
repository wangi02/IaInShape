# -*- coding: utf-8 -*-
"""
API Routes: RESTful endpoints for the Boxing Coach.
Following REST conventions: endpoints are nouns, HTTP verbs define actions.
"""

from flask import Blueprint, request, jsonify
from backend.models import get_user, get_all_users
from backend.services import adapt

api = Blueprint("api", __name__, url_prefix="/api")


@api.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint for monitoring."""
    return jsonify({"status": "ok", "service": "IA InShape API"}), 200


@api.route("/users", methods=["GET"])
def list_users():
    """Get all registered users."""
    try:
        users = get_all_users()
        return jsonify({"users": users}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route("/users/<int:user_id>", methods=["GET"])
def get_user_profile(user_id: int):
    """Get a specific user's profile."""
    user = get_user(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user), 200


@api.route("/adapt", methods=["POST"])
def get_adaptation():
    """
    Main adaptation endpoint.
    Receives real-time context and returns coaching instructions.
    
    Request Body:
    {
        "user_id": 1,
        "context": {
            "fatigue": 0.45,
            "space": "Optimal",
            "guard_accuracy": 0.85,
            "time_remaining": 120,
            "current_phase": "Technique"
        }
    }
    
    Response:
    {
        "phase": "Shadow Boxing",
        "instruction": "JAB - CROSS - ESQUIVE",
        "sub_feedback": "Accélère le rythme !",
        "intensity": "high",
        "alerts": []
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON body provided"}), 400
        
        user_id = data.get("user_id")
        context = data.get("context", {})
        
        if not user_id:
            return jsonify({"error": "user_id is required"}), 400
        
        # Fetch user from database
        user = get_user(user_id)
        if not user:
            return jsonify({"error": f"User {user_id} not found"}), 404
        
        # Run adaptation engine
        response = adapt(user, context)
        
        return jsonify(response), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route("/adapt/preview", methods=["POST"])
def preview_adaptation():
    """
    Preview adaptation without a real user (for testing/demo).
    Accepts a full user object instead of user_id.
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON body provided"}), 400
        
        user = data.get("user", {})
        context = data.get("context", {})
        
        # Provide default user if not specified
        if not user:
            user = {
                "id": 0,
                "name": "Demo User",
                "level": "Débutant",
                "endurance": 50,
                "injuries": []
            }
        
        response = adapt(user, context)
        return jsonify(response), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- SESSION MANAGEMENT ENDPOINTS ---

@api.route("/sessions/credits/<int:user_id>", methods=["GET"])
def get_session_credits(user_id: int):
    """
    Get remaining session credits for today.
    Max 3 live sessions per day.
    """
    from backend.models.session import get_today_session_count
    
    count = get_today_session_count(user_id)
    remaining = max(0, 3 - count)
    
    return jsonify({
        "user_id": user_id,
        "sessions_today": count,
        "credits_remaining": remaining,
        "max_daily": 3
    }), 200


@api.route("/sessions/start", methods=["POST"])
def start_session():
    """
    Start a new training session.
    Decrements a credit and records the session.
    
    Request Body:
    {
        "user_id": 1,
        "mood": "Énergique"
    }
    """
    from backend.models.session import get_today_session_count, create_session
    
    data = request.get_json() or {}
    user_id = data.get("user_id")
    mood = data.get("mood", "Normal")
    
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400
    
    # Check credit limit
    count = get_today_session_count(user_id)
    if count >= 3:
        return jsonify({
            "error": "Daily limit reached",
            "credits_remaining": 0,
            "suggestion": "static_workout"
        }), 403
    
    # Create session
    session_id = create_session(user_id, mood)
    
    return jsonify({
        "session_id": session_id,
        "mood": mood,
        "credits_remaining": 2 - count,
        "duration_seconds": 30
    }), 201


@api.route("/sessions/<int:session_id>/complete", methods=["POST"])
def complete_session(session_id: int):
    """
    Complete a session and record the score.
    
    Request Body:
    {
        "score": 8,
        "moves_completed": 10,
        "weaknesses": ["guard_low"]
    }
    """
    from backend.models.session import update_session_score
    
    data = request.get_json() or {}
    score = data.get("score", 0)
    
    update_session_score(session_id, score)
    
    return jsonify({
        "status": "completed",
        "score": score
    }), 200


# --- EXERCISES ENDPOINTS ---

@api.route("/exercises", methods=["GET"])
def list_exercises():
    """
    Get all exercises for mini-workouts.
    Optional query params: category, intensity
    """
    from backend.models.exercise import get_exercises
    
    category = request.args.get("category")
    intensity = request.args.get("intensity")
    
    exercises = get_exercises(category=category, intensity=intensity)
    
    return jsonify({"exercises": exercises}), 200


@api.route("/exercises/warmup", methods=["GET"])
def get_warmup_exercises():
    """Get exercises for the warmup phase."""
    from backend.models.exercise import get_exercises
    
    exercises = get_exercises(category="warmup")
    return jsonify({"exercises": exercises}), 200


@api.route("/exercises/workout/<string:weakness>", methods=["GET"])
def get_targeted_workout(weakness: str):
    """
    Get a mini-workout targeting a specific weakness.
    Example weaknesses: guard_low, slow_jab, poor_stance
    """
    from backend.models.exercise import get_targeted_exercises
    
    exercises = get_targeted_exercises(weakness)
    return jsonify({
        "weakness": weakness,
        "exercises": exercises
    }), 200
