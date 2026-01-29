// --- Types & Interfaces centralisés ---

export type Level = 'Débutant' | 'Avancé';
export type Phase = 'Échauffement' | 'Technique' | 'Shadow Boxing' | 'Correction Posturale' | 'Récupération';
export type GoalType = 'jab_left' | 'jab_right' | 'guard' | 'hook_left' | 'hook_right' | 'rest';
export type CoachState = 'CALIBRATING' | 'INSTRUCTION' | 'CORRECTION';

export interface UserModel {
  id?: number;
  name?: string;
  level: Level;
  injuries: string[];
  endurance: number; // 0-100
}

export interface ContextModel {
  space: 'Limité' | 'Optimal';
  fatigue: number; // 0-1
  timeRemaining: number; // seconds
  guardAccuracy: number; // 0-1
}

export interface AdaptationResponse {
  phase: Phase;
  instruction: string;
  sub_feedback: string;
  intensity: string;
  alerts: string[];
}

export interface HistoryEntry {
  date: string;
  total_score: number;
  total_duration: number;
  session_count: number;
}

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

// MediaPipe globals (injected via CDN)
declare global {
  interface Window {
    Pose: any;
    Camera: any;
    drawConnectors: any;
    drawLandmarks: any;
    POSE_CONNECTIONS: any;
  }
}

// Phases autorisées par niveau
export const PHASES_BY_LEVEL: Record<Level, Phase[]> = {
  'Débutant': ['Échauffement', 'Technique', 'Correction Posturale'],
  'Avancé': ['Échauffement', 'Technique', 'Shadow Boxing', 'Correction Posturale', 'Récupération']
};
