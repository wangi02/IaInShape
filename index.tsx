
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  User,
  Settings,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Maximize,
  Minimize,
  Play,
  Square,
  ChevronRight,
  TrendingUp,
  Target,
  Clock,
  Flame,
  Dumbbell,
  ArrowRight,
  Lock,
  Mail,
  Github,
  CheckCircle,
  Heart,
  Battery,
  ThumbsUp,
  Scan,
  RefreshCw,
  X,
  ChevronLeft,
  Volume2
} from 'lucide-react';

// --- Global Types for MediaPipe (injected via CDN in index.html) ---
declare global {
  interface Window {
    Pose: any;
    Camera: any;
    drawConnectors: any;
    drawLandmarks: any;
    POSE_CONNECTIONS: any;
  }
}

// --- Constants & Types ---
type Level = 'Débutant' | 'Avancé';
type Phase = 'Échauffement' | 'Technique' | 'Shadow Boxing' | 'Correction Posturale' | 'Récupération';

// API Configuration
const API_URL = 'http://localhost:5001/api';

// Configuration de l'Adaptation : Phases autorisées par niveau
const PHASES_BY_LEVEL: Record<Level, Phase[]> = {
  'Débutant': ['Échauffement', 'Technique', 'Correction Posturale'],
  'Avancé': ['Échauffement', 'Technique', 'Shadow Boxing', 'Correction Posturale', 'Récupération']
};

interface UserModel {
  id?: number;
  name?: string;
  level: Level;
  injuries: string[];
  endurance: number; // 0-100
}

interface ContextModel {
  space: 'Limité' | 'Optimal';
  fatigue: number; // 0-1 (derived from velocity decay)
  timeRemaining: number; // seconds
  guardAccuracy: number; // 0-1
}

// --- API Helper Functions ---
const api = {
  async fetchUsers(): Promise<UserModel[]> {
    const res = await fetch(`${API_URL}/users`);
    const data = await res.json();
    return data.users.map((u: any) => ({
      id: u.id,
      name: u.name,
      level: u.level as Level,
      injuries: u.injuries || [],
      endurance: u.endurance
    }));
  },

  async fetchUser(userId: number): Promise<UserModel | null> {
    const res = await fetch(`${API_URL}/users/${userId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: data.user.id,
      name: data.user.name,
      level: data.user.level as Level,
      injuries: data.user.injuries || [],
      endurance: data.user.endurance
    };
  },

  async adapt(userId: number, context: ContextModel): Promise<{
    phase: Phase;
    instruction: string;
    sub_feedback: string;
    intensity: string;
    alerts: string[];
  }> {
    const res = await fetch(`${API_URL}/adapt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        context: {
          fatigue: context.fatigue,
          guard_accuracy: context.guardAccuracy,
          space: context.space,
          time_remaining: context.timeRemaining
        }
      })
    });
    return res.json();
  },

  async getCredits(userId: number): Promise<{ sessions_today: number, credits_remaining: number }> {
    const res = await fetch(`${API_URL}/sessions/credits/${userId}`);
    return res.json();
  },

  async startSession(userId: number, mood: string): Promise<any> {
    const res = await fetch(`${API_URL}/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, mood })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async completeSession(sessionId: number, score: number = 0): Promise<any> {
    const res = await fetch(`${API_URL}/sessions/${sessionId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score })
    });
    return res.json();
  },

  async getExercises(category: string = 'general'): Promise<any> {
    const res = await fetch(`${API_URL}/exercises?category=${category}`);
    return res.json();
  }
};

// --- Pose Analysis Utilities (MediaPipe) ---
type GoalType = 'jab_left' | 'jab_right' | 'guard' | 'hook_left' | 'hook_right' | 'rest';

interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

// MediaPipe Pose Landmark Indices
const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
};

/**
 * Calculate angle between three points (in degrees).
 * Used to detect arm extension.
 */
const calculateAngle = (a: Landmark, b: Landmark, c: Landmark): number => {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180 / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
};

/**
 * Detect if the user is throwing a Jab.
 * - Arm is extended (elbow angle > 150°)
 * - Wrist is significantly forward (Z-depth)
 */
const detectJab = (landmarks: Landmark[]): 'left' | 'right' | null => {
  if (!landmarks || landmarks.length < 17) return null;

  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const leftElbow = landmarks[POSE_LANDMARKS.LEFT_ELBOW];
  const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const rightElbow = landmarks[POSE_LANDMARKS.RIGHT_ELBOW];
  const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];

  const leftArmAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
  const rightArmAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);

  // Thresholds: Arm nearly straight + wrist extended forward (lower Z = closer to camera)
  const JAB_ANGLE_THRESHOLD = 150;
  const JAB_Z_THRESHOLD = -0.15; // Wrist must be forward of shoulder

  if (leftArmAngle > JAB_ANGLE_THRESHOLD && leftWrist.z < leftShoulder.z + JAB_Z_THRESHOLD) {
    return 'left';
  }
  if (rightArmAngle > JAB_ANGLE_THRESHOLD && rightWrist.z < rightShoulder.z + JAB_Z_THRESHOLD) {
    return 'right';
  }
  return null;
};

/**
 * Detect if the user has a proper Guard position.
 * - Both wrists are near chin level (high Y)
 * - Wrists are close together (small X gap)
 */
const detectGuard = (landmarks: Landmark[]): boolean => {
  if (!landmarks || landmarks.length < 17) return false;

  const nose = landmarks[POSE_LANDMARKS.NOSE];
  const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
  const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];

  // Wrists should be above nose level (lower Y = higher on screen)
  const wristsHighEnough = leftWrist.y < nose.y + 0.1 && rightWrist.y < nose.y + 0.1;

  // Wrists should be within shoulder width
  const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
  const wristGap = Math.abs(rightWrist.x - leftWrist.x);
  const wristsCloseTogether = wristGap < shoulderWidth * 1.2;

  return wristsHighEnough && wristsCloseTogether;
};

/**
 * Play a success "PING" sound using Web Audio API.
 * No external file needed - generates a short beep tone.
 */
const playSuccessSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.frequency.value = 880; // A5 note - bright, cheerful
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.2);
  } catch (e) {
    console.log("Audio feedback unavailable");
  }
};

// --- Shared Components ---

const ProgressBar = ({ value, label, color = "bg-red-500" }: { value: number, label: string, color?: string }) => (
  <div className="w-full">
    <div className="flex justify-between text-[10px] mb-1 font-bold opacity-70 uppercase tracking-wider">
      <span>{label}</span>
      <span>{Math.round(value * 100)}%</span>
    </div>
    <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
      <div
        className={`${color} h-full transition-all duration-500 ease-out`}
        style={{ width: `${value * 100}%` }}
      />
    </div>
  </div>
);

const MetricCard = ({ icon: Icon, label, value, subtext }: { icon: any, label: string, value: string, subtext?: string }) => (
  <div className="glass p-4 rounded-xl flex items-center gap-4 flex-1">
    <div className="p-3 rounded-lg bg-red-500/10 text-red-500">
      <Icon size={24} />
    </div>
    <div>
      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{label}</p>
      <p className="text-xl font-black text-zinc-100 leading-none mt-1">{value}</p>
      {subtext && <p className="text-[10px] text-zinc-600 mt-1">{subtext}</p>}
    </div>
  </div>
);

// --- Onboarding Wizard Component ---

const OnboardingWizard = ({ onComplete }: { onComplete: (profile: UserModel) => void }) => {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<UserModel>({
    level: 'Débutant',
    endurance: 50,
    injuries: []
  });

  const nextStep = () => setStep(s => s + 1);

  const finish = () => {
    onComplete(profile);
  };

  const toggleInjury = (injury: string) => {
    setProfile(prev => {
      // Si on sélectionne une blessure spécifique, on s'assure que la liste n'est pas vide (conceptuellement)
      const exists = prev.injuries.includes(injury);
      return {
        ...prev,
        injuries: exists
          ? prev.injuries.filter(i => i !== injury)
          : [...prev.injuries, injury]
      };
    });
  };

  const setNoInjuries = () => {
    setProfile(prev => ({ ...prev, injuries: [] }));
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[150px] rounded-full" />
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-red-600/10 blur-[150px] rounded-full" />
      </div>

      <div className="glass max-w-2xl w-full p-8 rounded-3xl border border-zinc-700/50 shadow-2xl relative z-10 animate-in zoom-in-95 duration-500">

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map(i => (
            <div key={i} className={`w-3 h-3 rounded-full transition-all ${step >= i ? 'bg-red-600 scale-110' : 'bg-zinc-800'}`} />
          ))}
        </div>

        {/* STEP 1: LEVEL */}
        {step === 1 && (
          <div className="space-y-6 text-center animate-in fade-in slide-in-from-right-8 duration-300">
            <h2 className="text-3xl font-black italic uppercase text-white">C'est quoi ton <span className="text-red-600">Level</span> ?</h2>
            <p className="text-zinc-500 text-sm">On adapte la vitesse du coach à ton expérience.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              <button
                onClick={() => { setProfile({ ...profile, level: 'Débutant' }); nextStep(); }}
                className="group p-6 rounded-2xl bg-zinc-900/50 border border-zinc-700 hover:border-red-500 hover:bg-red-600/10 transition-all text-left"
              >
                <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-2xl">🐣</div>
                <h3 className="font-bold text-white text-lg mb-1">Jamais boxé</h3>
                <p className="text-xs text-zinc-500 group-hover:text-zinc-300">Je veux apprendre les bases tranquillement.</p>
              </button>

              <button
                onClick={() => { setProfile({ ...profile, level: 'Avancé' }); nextStep(); }}
                className="group p-6 rounded-2xl bg-zinc-900/50 border border-zinc-700 hover:border-red-500 hover:bg-red-600/10 transition-all text-left"
              >
                <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-2xl">🥊</div>
                <h3 className="font-bold text-white text-lg mb-1">Je connais le job</h3>
                <p className="text-xs text-zinc-500 group-hover:text-zinc-300">J'ai déjà fait des sparrings ou du sac.</p>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: ENDURANCE (Via Sport Frequency) */}
        {step === 2 && (
          <div className="space-y-6 text-center animate-in fade-in slide-in-from-right-8 duration-300">
            <h2 className="text-3xl font-black italic uppercase text-white">Ton rythme <span className="text-blue-500">Sportif</span> ?</h2>
            <p className="text-zinc-500 text-sm">À quelle fréquence fais-tu du sport en général ?</p>

            <div className="space-y-4 mt-6">
              <button
                onClick={() => { setProfile({ ...profile, endurance: 30 }); nextStep(); }}
                className="w-full p-4 rounded-xl bg-zinc-900/50 border border-zinc-700 hover:bg-zinc-800 flex items-center gap-4 transition-all group"
              >
                <Battery size={24} className="text-green-500" />
                <div className="text-left">
                  <span className="block font-bold text-white">Tranquille (0-1 fois/sem)</span>
                  <span className="text-xs text-zinc-500">Je débute ou je reprends, on y va cool.</span>
                </div>
                <ChevronRight className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button
                onClick={() => { setProfile({ ...profile, endurance: 65 }); nextStep(); }}
                className="w-full p-4 rounded-xl bg-zinc-900/50 border border-zinc-700 hover:bg-zinc-800 flex items-center gap-4 transition-all group"
              >
                <Battery size={24} className="text-yellow-500" />
                <div className="text-left">
                  <span className="block font-bold text-white">Actif (2-3 fois/sem)</span>
                  <span className="text-xs text-zinc-500">J'ai une bonne condition physique générale.</span>
                </div>
                <ChevronRight className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button
                onClick={() => { setProfile({ ...profile, endurance: 95 }); nextStep(); }}
                className="w-full p-4 rounded-xl bg-zinc-900/50 border border-zinc-700 hover:bg-zinc-800 flex items-center gap-4 transition-all group"
              >
                <Battery size={24} className="text-red-500" />
                <div className="text-left">
                  <span className="block font-bold text-white">Spartiate (4+ fois/sem)</span>
                  <span className="text-xs text-zinc-500">Le sport c'est ma vie. Je veux me dépasser.</span>
                </div>
                <ChevronRight className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: INJURIES */}
        {step === 3 && (
          <div className="space-y-6 text-center animate-in fade-in slide-in-from-right-8 duration-300">
            <h2 className="text-3xl font-black italic uppercase text-white">Des <span className="text-yellow-500">Bobos</span> à signaler ?</h2>
            <p className="text-zinc-500 text-sm">L'IA évitera les mouvements dangereux pour ces zones.</p>

            <div className="mt-6 mb-8">
              {/* Option Aucune */}
              <button
                onClick={setNoInjuries}
                className={`w-full mb-4 px-6 py-4 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${profile.injuries.length === 0
                  ? 'bg-green-500/20 border-green-500 text-green-400'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
              >
                <ThumbsUp size={16} /> Rien à signaler, je suis solide !
              </button>

              <div className="flex flex-wrap justify-center gap-3">
                {['Épaules', 'Dos', 'Genoux', 'Poignets', 'Cou'].map(part => (
                  <button
                    key={part}
                    onClick={() => toggleInjury(part)}
                    className={`px-6 py-3 rounded-full text-sm font-bold border transition-all ${profile.injuries.includes(part)
                      ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                      }`}
                  >
                    {part}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <button
                onClick={finish}
                className="w-full bg-white text-black font-black italic uppercase py-4 rounded-xl hover:scale-[1.02] transition-transform shadow-xl flex items-center justify-center gap-2"
              >
                C'est parti ! <CheckCircle size={20} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// --- Landing Page Component ---

const LandingPage = ({ onLogin, onSignUp }: { onLogin: () => void, onSignUp: () => void }) => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-zinc-950 flex relative overflow-hidden">
      {/* BRANDING BACKGROUND - METHODE ROBUSTE AVEC DIV CSS */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-no-repeat transition-opacity duration-1000 ease-in-out"
        style={{
          // Note: C'est l'URL Unsplash de l'image "Phantom Athletics Boxer" (gants devant le visage)
          // Si vous avez l'image en local, remplacez par : url('./path/to/image.jpg')
          backgroundImage: `url('https://images.unsplash.com/photo-1615117970176-65bbe41164a6?q=80&w=2070&auto=format&fit=crop')`,
          // On force le positionnement sur le haut pour voir le visage et les gants
          backgroundPosition: 'center 20%',
          // On augmente la luminosité car l'image originale est très sombre (Low Key)
          filter: 'brightness(1.1) contrast(1.1)'
        }}
      >
        {/* Calque Noir semi-transparent global pour homogénéiser */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Calque Dégradé Gauche -> Droite pour la lisibilité du texte (ne cache pas le boxeur à droite) */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
      </div>

      <div className="container mx-auto max-w-6xl p-6 flex flex-col md:flex-row items-center gap-12 relative z-10">

        {/* Left: Branding & Pitch */}
        <div className="flex-1 space-y-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center font-black text-white italic text-2xl shadow-lg shadow-red-900/40 rotate-3">I</div>
              <span className="text-[10px] font-bold bg-zinc-800/80 backdrop-blur text-zinc-400 px-2 py-1 rounded uppercase tracking-widest border border-zinc-700">Alpha Version 0.9</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter text-white leading-[0.9] drop-shadow-2xl">
              IA <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-600">INSHAPE</span>
            </h1>
            <p className="text-xl md:text-2xl font-bold text-zinc-300 italic drop-shadow-lg">
              "BOUM ! Ton coach de boxe adaptatif."
            </p>
          </div>

          <div className="max-w-md space-y-4 text-zinc-400">
            <p className="drop-shadow-md">
              Une expérience universitaire unique combinant <span className="text-zinc-200 font-bold">Vision par Ordinateur</span> et <span className="text-zinc-200 font-bold">Systèmes Adaptatifs</span>.
            </p>
            <ul className="space-y-2 text-sm border-l-2 border-red-600/50 pl-4">
              <li className="flex items-center gap-2"><Target size={14} className="text-red-500" /> Analyse de posture en temps réel (MediaPipe)</li>
              <li className="flex items-center gap-2"><Activity size={14} className="text-blue-500" /> Adaptation à la fatigue et à l'espace</li>
              <li className="flex items-center gap-2"><ShieldCheck size={14} className="text-green-500" /> Prévention des blessures</li>
            </ul>
          </div>

          <div className="flex gap-4 pt-4">
            <button className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">
              <Github size={16} /> Documentation Projet
            </button>
          </div>
        </div>

        {/* Right: Auth Card */}
        <div className="flex-1 w-full max-w-md">
          <div className="glass p-8 rounded-3xl border border-zinc-700/50 shadow-2xl relative backdrop-blur-xl bg-black/40">
            <div className="absolute -top-6 -right-6 w-12 h-12 bg-red-600 text-white flex items-center justify-center rounded-full font-black text-xl italic shadow-lg animate-bounce">
              !
            </div>

            <div className="mb-8 text-center">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">
                {isLogin ? 'Connexion' : 'Rejoindre la Team'}
              </h2>
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-2">Accès au Dashboard</p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="email"
                  placeholder="Email étudiant"
                  className="w-full bg-zinc-900/60 border border-zinc-700 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-red-500 transition-colors placeholder:text-zinc-600"
                />
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="password"
                  placeholder="Mot de passe"
                  className="w-full bg-zinc-900/60 border border-zinc-700 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-red-500 transition-colors placeholder:text-zinc-600"
                />
              </div>

              <button
                onClick={() => {
                  if (isLogin) {
                    onLogin(); // Skip Onboarding
                  } else {
                    onSignUp(); // Go to Onboarding
                  }
                }}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black italic uppercase py-4 rounded-xl shadow-lg shadow-red-900/20 transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
              >
                {isLogin ? "S'entrainer" : "Créer mon profil"} <ArrowRight size={18} />
              </button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800"></div></div>
                <div className="relative flex justify-center"><span className="bg-black/80 px-4 text-xs text-zinc-500 font-medium uppercase">Ou</span></div>
              </div>

              <button
                onClick={onSignUp}
                className="w-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 font-bold uppercase py-3 rounded-xl border border-zinc-700 transition-all text-xs tracking-widest"
              >
                Continuer en invité
              </button>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-xs text-zinc-500 hover:text-red-500 underline transition-colors"
              >
                {isLogin ? "Pas encore de compte ? S'inscrire" : "Déjà membre ? Se connecter"}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Strip */}
      <div className="absolute bottom-0 w-full p-4 border-t border-zinc-800/50 flex justify-between items-center text-[10px] text-zinc-600 font-medium uppercase tracking-[0.2em] bg-black/60 backdrop-blur-md">
        <span>Université Paris • AIS Project</span>
        <span>v0.9.2-beta</span>
      </div>
    </div>
  );
};

// --- Warm-up Screen Component (Static Image-Based) ---

interface WarmupExercise {
  id: number;
  name: string;
  icon: string;
  description: string;
  duration: number; // seconds
  focus: string;
}

const WARMUP_EXERCISES: WarmupExercise[] = [
  { id: 1, name: "Rotation du Cou", icon: "🔄", description: "Effectue des cercles lents avec la tête. 10 rotations dans chaque sens.", duration: 30, focus: "Mobilité" },
  { id: 2, name: "Rotation des Épaules", icon: "🔃", description: "Grands cercles avec les bras tendus. Active tes épaules.", duration: 30, focus: "Épaules" },
  { id: 3, name: "Jumping Jacks", icon: "⭐", description: "Sauts étoile dynamiques. Réveille ton cardio !", duration: 45, focus: "Cardio" },
  { id: 4, name: "Rotations du Bassin", icon: "🌀", description: "Cercles avec les hanches. Maintiens l'équilibre.", duration: 30, focus: "Mobilité" },
  { id: 5, name: "Shadow Boxing Léger", icon: "🥊", description: "Jabs légers dans le vide. Trouve ton rythme.", duration: 45, focus: "Technique" },
  { id: 6, name: "Étirement Avant-Bras", icon: "💪", description: "Étend tes bras devant toi, tire tes doigts vers le bas.", duration: 30, focus: "Récupération" },
];

const WarmupScreen = ({ onComplete, onSkip }: { onComplete: () => void, onSkip: () => void }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(WARMUP_EXERCISES[0].duration);
  const [isRunning, setIsRunning] = useState(false);
  const [completedExercises, setCompletedExercises] = useState<number[]>([]);

  const currentExercise = WARMUP_EXERCISES[currentIndex];
  const progress = (currentIndex / WARMUP_EXERCISES.length) * 100;

  // Timer effect
  useEffect(() => {
    if (!isRunning) return;
    if (timeLeft <= 0) {
      handleExerciseComplete();
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  const handleExerciseComplete = () => {
    setIsRunning(false);
    setCompletedExercises(prev => [...prev, currentExercise.id]);

    if (currentIndex < WARMUP_EXERCISES.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setTimeLeft(WARMUP_EXERCISES[nextIndex].duration);
    } else {
      // All exercises done
      onComplete();
    }
  };

  const handleNext = () => {
    if (currentIndex < WARMUP_EXERCISES.length - 1) {
      setIsRunning(false);
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setTimeLeft(WARMUP_EXERCISES[nextIndex].duration);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsRunning(false);
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      setTimeLeft(WARMUP_EXERCISES[prevIndex].duration);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 animate-in fade-in duration-500">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black italic uppercase tracking-tight mb-2">
          🔥 Échauffement
        </h1>
        <p className="text-zinc-400 text-sm">Prépare ton corps avant l'entraînement</p>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-md mb-8">
        <div className="flex justify-between text-xs text-zinc-500 mb-2">
          <span>{currentIndex + 1} / {WARMUP_EXERCISES.length}</span>
          <span>{Math.round(progress)}% Complété</span>
        </div>
        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Exercise Card */}
      <div className="glass p-8 rounded-3xl max-w-lg w-full text-center border border-zinc-700/50 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none" />

        {/* Icon */}
        <div className="text-7xl mb-6 animate-bounce">{currentExercise.icon}</div>

        {/* Exercise Info */}
        <h2 className="text-2xl font-black uppercase mb-3">{currentExercise.name}</h2>
        <p className="text-zinc-400 mb-6 leading-relaxed">{currentExercise.description}</p>

        {/* Focus Tag */}
        <div className="inline-block px-4 py-1 bg-zinc-800 rounded-full text-xs font-bold uppercase tracking-widest text-zinc-400 mb-6">
          {currentExercise.focus}
        </div>

        {/* Timer */}
        <div className="mb-8">
          <div className={`text-5xl font-black tabular-nums ${isRunning ? 'text-orange-500' : 'text-white'}`}>
            {timeLeft}s
          </div>
          <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Durée</div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="p-3 rounded-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={24} />
          </button>

          <button
            onClick={() => isRunning ? handleExerciseComplete() : setIsRunning(true)}
            className={`px-8 py-4 rounded-xl font-black uppercase text-lg transition-all ${isRunning
              ? 'bg-orange-500 hover:bg-orange-400 text-black'
              : 'bg-white hover:bg-zinc-200 text-black'
              }`}
          >
            {isRunning ? 'Terminé ✓' : 'Démarrer'}
          </button>

          <button
            onClick={handleNext}
            disabled={currentIndex === WARMUP_EXERCISES.length - 1}
            className="p-3 rounded-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      {/* Skip Button */}
      <button
        onClick={onSkip}
        className="mt-8 text-zinc-500 hover:text-white text-sm font-medium uppercase tracking-widest transition-colors"
      >
        Passer l'échauffement →
      </button>

      {/* Completed Indicators */}
      <div className="flex gap-2 mt-8">
        {WARMUP_EXERCISES.map((ex, idx) => (
          <div
            key={ex.id}
            className={`w-3 h-3 rounded-full transition-all ${completedExercises.includes(ex.id)
              ? 'bg-green-500 scale-125'
              : idx === currentIndex
                ? 'bg-orange-500 animate-pulse'
                : 'bg-zinc-700'
              }`}
          />
        ))}
      </div>
    </div>
  );
};

// --- Dashboard Component (The main app) ---

type CoachState = 'CALIBRATING' | 'INSTRUCTION' | 'CORRECTION';

const Dashboard = ({ onLogout, initialProfile, currentMood, sessionCredits }: { onLogout: () => void, initialProfile: UserModel, currentMood: string, sessionCredits: number }) => {
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<Phase>('Échauffement');
  const [userModel, setUserModel] = useState<UserModel>(initialProfile);
  const [context, setContext] = useState<ContextModel>({
    space: 'Optimal',
    fatigue: 0.1,
    timeRemaining: 30, // 30s session
    guardAccuracy: 0.85
  });

  // Session State
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [sessionScore, setSessionScore] = useState(0);
  const [miniWorkout, setMiniWorkout] = useState<any[]>([]);

  // AI Coach Feedback State
  const [coachState, setCoachState] = useState<CoachState>('CALIBRATING');
  const [mainInstruction, setMainInstruction] = useState("Scan de l'environnement...");
  const [subFeedback, setSubFeedback] = useState("");
  const [calibrationProgress, setCalibrationProgress] = useState(0);

  // Gamification State (NEW)
  const [currentGoal, setCurrentGoal] = useState<GoalType>('guard');
  const [liveScore, setLiveScore] = useState(0);
  const [showSuccessFlash, setShowSuccessFlash] = useState(false);
  const lastDetectionRef = useRef<number>(0); // Prevent rapid-fire detections

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Timer & Session End
  useEffect(() => {
    if (!isActive) return;

    const timer = setInterval(() => {
      setContext(prev => {
        const newTime = Math.max(0, prev.timeRemaining - 1);
        if (newTime === 0) {
          handleSessionEnd();
          return { ...prev, timeRemaining: 0 };
        }
        return {
          ...prev,
          timeRemaining: newTime,
          fatigue: Math.min(1, prev.fatigue + 0.0005)
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive]);

  const handleSessionEnd = async () => {
    setIsActive(false);
    setIsSessionComplete(true);

    // Use actual live score from pose detection
    setSessionScore(liveScore);

    if (sessionId) {
      await api.completeSession(sessionId, liveScore);
    }

    // Fetch mini workout
    const exercises = await api.getExercises("general");
    setMiniWorkout(exercises.exercises.slice(0, 3));
  };

  // ... (Adaptation Effect skipped for brevity, keeping existing) ...

  // Keep existing TTS Helper & Trigger & Feedback Loop & Camera Handling...

  const toggleSession = async () => {
    if (!isActive) {
      // Start Session
      try {
        const res = await api.startSession(userModel.id!, currentMood);
        setSessionId(res.session_id);
        setContext(prev => ({ ...prev, timeRemaining: 30 }));
        setIsActive(true);
        setIsSessionComplete(false);
      } catch (err) {
        alert("Erreur démarrage session: Limit atteinte ?");
      }
    } else {
      setIsActive(false);
      window.speechSynthesis.cancel();
    }
  };

  // Règles d'Adaptation - Appel à l'API Backend
  useEffect(() => {
    const allowedPhases = PHASES_BY_LEVEL[userModel.level];
    if (!allowedPhases.includes(phase)) {
      setPhase(allowedPhases[0]);
    }

    if (!isActive || !userModel.id) return;

    // Call the adaptation API every 3 seconds during an active session
    const adaptInterval = setInterval(async () => {
      try {
        const response = await api.adapt(userModel.id!, context);

        // Apply the adapted phase if valid
        if (response.phase && allowedPhases.includes(response.phase as Phase)) {
          setPhase(response.phase as Phase);
        }

        // Update coach feedback with API response
        if (response.instruction) {
          setMainInstruction(response.instruction);
        }
        if (response.sub_feedback) {
          setSubFeedback(response.sub_feedback);
        }

        // Switch to correction mode if alerts are present
        if (response.alerts && response.alerts.length > 0) {
          setCoachState('CORRECTION');
        }
      } catch (err) {
        console.error("Adaptation API Error:", err);
      }
    }, 3000);

    return () => clearInterval(adaptInterval);
  }, [context.fatigue, context.guardAccuracy, userModel.id, userModel.level, isActive, phase]);


  // --- TTS HELPER ---
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Cancel previous utterances
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 1.1; // Slightly faster for coaching
      window.speechSynthesis.speak(utterance);
    }
  };

  // --- TTS TRIGGER ---
  useEffect(() => {
    if (!isActive) {
      window.speechSynthesis.cancel();
      return;
    }
    // Only speak main instructions that aren't purely visual feedback like "Scan..."
    if (coachState !== 'CALIBRATING') {
      speak(mainInstruction);
    }
  }, [mainInstruction, isActive, coachState]);


  // --- FLUID FEEDBACK LOOP (AI BRAIN) ---
  useEffect(() => {
    if (!isActive) {
      setCoachState('CALIBRATING');
      setCalibrationProgress(0);
      return;
    }

    // 1. PHASE CALIBRATION (0-3s)
    if (coachState === 'CALIBRATING') {
      setMainInstruction("Scan de l'environnement...");
      const interval = setInterval(() => {
        setCalibrationProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setCoachState('INSTRUCTION');
            speak("Analyse terminée. C'est parti pour l'entraînement.");
            return 100;
          }
          return prev + 5;
        });
      }, 100);
      return () => clearInterval(interval);
    }

    // 2. BOUCLE INSTRUCTION <-> CORRECTION
    // Note: Main instructions are now driven by the Gamification Loop in 'onResults'.
    // This effect primarily handles Calibration and occasional random corrections.

    if (coachState === 'INSTRUCTION') {
      // Initialize first instruction if empty
      if (mainInstruction === "Scan de l'environnement...") {
        setMainInstruction("🛡️ GARDE HAUTE !");
      }

      // Randomly trigger a "Correction" event after 8-12 seconds (less frequent)
      const triggerCorrection = setTimeout(() => {
        setCoachState('CORRECTION');
      }, Math.random() * 4000 + 8000);

      return () => clearTimeout(triggerCorrection);
    }

    if (coachState === 'CORRECTION') {
      // Simuler une détection d'erreur par MediaPipe
      const errors = [
        "Garde trop basse !",
        "Coudes trop écartés",
        "Rotation hanche manquante",
        "Menton exposé"
      ];
      const randomError = errors[Math.floor(Math.random() * errors.length)];
      setMainInstruction(randomError);
      setSubFeedback("Corrige ta posture immédiatement.");

      // Revenir à l'instruction après 3s (laisser le temps de corriger)
      const returnToInstruction = setTimeout(() => {
        setCoachState('INSTRUCTION');
        // Restore last goal instruction
        const goalLabels: Record<GoalType, string> = {
          'guard': '🛡️ GARDE HAUTE !',
          'jab_left': '🥊 JAB GAUCHE !',
          'jab_right': '🥊 JAB DROIT !',
          'hook_left': '💥 CROCHET GAUCHE !',
          'hook_right': '💥 CROCHET DROIT !',
          'rest': '🧘 RÉCUPÈRE...'
        };
        setMainInstruction(goalLabels[currentGoal]);
        setSubFeedback("C'est mieux. On reprend.");
      }, 3500);

      return () => clearTimeout(returnToInstruction);
    }

  }, [isActive, coachState, phase, currentGoal]);


  // --- CAMERA HANDLING & MEDIAPIPE ---
  useEffect(() => {
    if (!isActive) return;

    let camera: any = null;
    let pose: any = null;

    const onResults = (results: any) => {
      if (!canvasRef.current || !videoRef.current) return;

      const canvasCtx = canvasRef.current.getContext('2d');
      if (!canvasCtx) return;

      // Ensure canvas size matches video size
      if (canvasRef.current.width !== videoRef.current.videoWidth) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
      }

      const width = canvasRef.current.width;
      const height = canvasRef.current.height;

      // 1. Draw Video Frame
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, width, height);
      canvasCtx.drawImage(results.image, 0, 0, width, height);

      // 2. Draw Exoskeleton
      if (results.poseLandmarks) {
        // Bones (Cyan/Tech look)
        if (window.drawConnectors) {
          window.drawConnectors(canvasCtx, results.poseLandmarks, window.POSE_CONNECTIONS, {
            color: '#06b6d4', // Cyan-500
            lineWidth: 4
          });
        }

        // Joints (Red/Target look)
        if (window.drawLandmarks) {
          window.drawLandmarks(canvasCtx, results.poseLandmarks, {
            color: '#ef4444', // Red-500
            lineWidth: 2,
            radius: 4
          });
        }

        // --- GAMIFICATION: Check if goal is achieved ---
        const now = Date.now();
        const DETECTION_COOLDOWN = 1500; // 1.5s between detections to prevent spam

        if (now - lastDetectionRef.current > DETECTION_COOLDOWN) {
          const jabDetected = detectJab(results.poseLandmarks);
          const guardDetected = detectGuard(results.poseLandmarks);

          let goalAchieved = false;

          if (currentGoal === 'jab_left' && jabDetected === 'left') goalAchieved = true;
          if (currentGoal === 'jab_right' && jabDetected === 'right') goalAchieved = true;
          if (currentGoal === 'guard' && guardDetected) goalAchieved = true;

          if (goalAchieved) {
            lastDetectionRef.current = now;
            setLiveScore(prev => prev + 1);
            setShowSuccessFlash(true);
            playSuccessSound(); // Audio feedback
            setTimeout(() => setShowSuccessFlash(false), 300);

            // Pick next goal
            const goals: GoalType[] = userModel.level === 'Débutant'
              ? ['guard', 'jab_right', 'jab_left']
              : ['guard', 'jab_right', 'jab_left', 'hook_left', 'hook_right'];
            const nextGoal = goals[Math.floor(Math.random() * goals.length)];
            setCurrentGoal(nextGoal);

            // Update instruction
            const goalLabels: Record<GoalType, string> = {
              'guard': '🛡️ GARDE HAUTE !',
              'jab_left': '🥊 JAB GAUCHE !',
              'jab_right': '🥊 JAB DROIT !',
              'hook_left': '💥 CROCHET GAUCHE !',
              'hook_right': '💥 CROCHET DROIT !',
              'rest': '🧘 RÉCUPÈRE...'
            };
            setMainInstruction(goalLabels[nextGoal]);
            setSubFeedback('Bravo ! Continue 🔥');
          }
        }
      }
      canvasCtx.restore();
    };

    const setupMediaPipe = async () => {
      if (!window.Pose || !window.Camera) {
        console.error("MediaPipe scripts not loaded");
        return;
      }

      pose = new window.Pose({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      pose.onResults(onResults);

      if (videoRef.current) {
        camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            if (pose && videoRef.current) await pose.send({ image: videoRef.current });
          },
          width: 1280,
          height: 720
        });
        camera.start();
      }
    };

    setupMediaPipe();

    return () => {
      if (camera) camera.stop();
      if (pose) pose.close();
    };
  }, [isActive]);

  const handlePhaseChange = (direction: 'next' | 'prev') => {
    const allowed = PHASES_BY_LEVEL[userModel.level];
    const currentIndex = allowed.indexOf(phase);
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % allowed.length;
    } else {
      newIndex = (currentIndex - 1 + allowed.length) % allowed.length;
    }
    setPhase(allowed[newIndex]);
    setCoachState('INSTRUCTION'); // Reset instruction state
  };

  // --- RENDERING ---

  // 1. SESSION REPORT (POST-SESSION)
  if (isSessionComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 animate-in fade-in duration-500">
        <div className="glass p-8 rounded-3xl max-w-2xl w-full">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black italic uppercase mb-2">Session Terminée !</h2>
            <p className="text-zinc-400">Voici ton bilan et ton mini-workout personnalisé.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 text-center">
              <div className="text-4xl font-black text-white mb-1">{sessionScore}</div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Mouvements Réussis</div>
            </div>
            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 text-center">
              <div className="text-4xl font-black text-green-500 mb-1">30s</div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Durée</div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Mini Workout de Renforcement</h3>
            <div className="space-y-3">
              {miniWorkout.map((ex, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-zinc-900/30 p-4 rounded-xl border border-zinc-800">
                  <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0">
                    {ex.image_url ? <img src={ex.image_url} alt={ex.name} className="w-8 h-8 opacity-50" /> : <Dumbbell size={20} className="text-zinc-500" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-white">{ex.name}</div>
                    <div className="text-xs text-zinc-500">{ex.description || "Exercice de renforcement"} • {ex.duration_seconds}s</div>
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 border-zinc-700 hover:bg-green-500 hover:border-green-500 cursor-pointer transition-colors" />
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setIsSessionComplete(false)}
            className="w-full bg-white text-black font-black uppercase py-4 rounded-xl hover:scale-[1.02] transition-transform"
          >
            Retour au Dashboard
          </button>
        </div>
      </div>
    );
  }

  // 2. MODE IMMERSIF (TRAINING)
  if (isActive) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex text-white overflow-hidden">
        {/* SUCCESS FLASH OVERLAY */}
        {showSuccessFlash && (
          <div className="absolute inset-0 z-[100] bg-green-500/30 pointer-events-none animate-pulse" />
        )}

        {/* LIVE SCORE BADGE */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-zinc-700">
          <Zap size={20} className="text-yellow-500" />
          <span className="text-2xl font-black tabular-nums">{liveScore}</span>
          <span className="text-xs text-zinc-400 uppercase tracking-widest font-bold">Points</span>
        </div>
        {/* Hidden Video Source for Processing */}
        <video ref={videoRef} className="hidden" playsInline muted />

        {/* BACKGROUND VIDEO/CANVAS */}
        <div className="absolute inset-0 z-0">
          {/* Webcam Feed Canvas */}
          <div className="w-full h-full bg-zinc-900 relative">
            <canvas ref={canvasRef} className="w-full h-full object-cover opacity-60" />
            {/* Grid Overlay for "Tech" feel */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
          </div>
        </div>

        {/* TOP BAR */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-20 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 px-3 py-1 rounded text-[10px] font-black uppercase animate-pulse">Live Analysis</div>
            <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full backdrop-blur">
              <Volume2 size={12} className="text-zinc-400" />
              <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-black tabular-nums leading-none">
              {Math.floor(context.timeRemaining / 60)}:{(context.timeRemaining % 60).toString().padStart(2, '0')}
            </div>
            <div className="text-[10px] text-zinc-400 uppercase tracking-widest">Session Time</div>
          </div>
        </div>

        {/* BOTTOM NAV (DISCRETE CONTROLS) */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 group">
          <button
            onClick={() => handlePhaseChange('prev')}
            className="p-3 rounded-full bg-black/20 hover:bg-black/80 text-white/50 hover:text-white backdrop-blur-sm transition-all hover:scale-110 border border-white/5 hover:border-white/20"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase text-zinc-400 tracking-widest font-bold mb-1">Phase Actuelle</span>
            <div className="px-6 py-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-lg font-black italic uppercase min-w-[200px] text-center shadow-lg">
              {phase}
            </div>
          </div>

          <button
            onClick={() => handlePhaseChange('next')}
            className="p-3 rounded-full bg-black/20 hover:bg-black/80 text-white/50 hover:text-white backdrop-blur-sm transition-all hover:scale-110 border border-white/5 hover:border-white/20"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* RIGHT SIDEBAR (CONTEXT & FEEDBACK) */}
        <div className="absolute top-0 bottom-0 right-0 w-80 md:w-96 glass border-l border-zinc-700/50 z-20 flex flex-col p-6 animate-in slide-in-from-right duration-700">

          {/* AI FEEDBACK SECTION (TOP) */}
          <div className="flex-1 flex flex-col justify-center mb-8 relative">
            <div className="absolute top-0 left-0 w-full flex justify-between items-center mb-4">
              <div className="flex items-center gap-2 text-red-500">
                <Zap size={16} fill="currentColor" />
                <span className="text-xs font-bold uppercase tracking-widest">AI Coach</span>
              </div>
              {coachState === 'CORRECTION' && <AlertTriangle size={16} className="text-yellow-500 animate-bounce" />}
            </div>

            <div className="space-y-4 text-center">
              {coachState === 'CALIBRATING' ? (
                <div className="space-y-2">
                  <Scan size={48} className="mx-auto text-blue-500 animate-spin-slow" />
                  <h2 className="text-2xl font-black italic uppercase">{mainInstruction}</h2>
                  <ProgressBar value={calibrationProgress / 100} label="Calibration" color="bg-blue-500" />
                </div>
              ) : (
                <div className={`transition-all duration-500 ${coachState === 'CORRECTION' ? 'scale-110' : ''}`}>
                  <h2 className={`text-3xl font-black italic uppercase leading-none mb-2 ${coachState === 'CORRECTION' ? 'text-yellow-400' : 'text-white'}`}>
                    {mainInstruction}
                  </h2>
                  <p className="text-sm text-zinc-400 font-medium">{subFeedback}</p>
                </div>
              )}
            </div>
          </div>

          {/* CONTEXT MODEL SECTION (BOTTOM) */}
          <div className="bg-zinc-900/80 rounded-2xl p-4 border border-zinc-800 space-y-4">
            <div className="flex items-center gap-2 text-zinc-500 border-b border-zinc-800 pb-2 mb-2">
              <Activity size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Context Data</span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-400">Fatigue (Velocity)</span>
                  <span className={context.fatigue > 0.7 ? "text-red-500 font-bold" : "text-green-500"}>{Math.round(context.fatigue * 100)}%</span>
                </div>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-1000 ${context.fatigue > 0.7 ? "bg-red-500" : "bg-green-500"}`} style={{ width: `${context.fatigue * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-400">Espace Dispo</span>
                  <span className="text-white font-bold">{context.space}</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-400">Précision Garde</span>
                  <span className="text-blue-400 font-bold">{Math.round(context.guardAccuracy * 100)}%</span>
                </div>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${context.guardAccuracy * 100}%` }} />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={toggleSession}
            className="mt-6 w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <X size={18} /> Arrêter la session
          </button>
        </div>
      </div>
    );
  }

  // 2. MODE DASHBOARD (PRÉ-SESSION)
  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto flex flex-col gap-6 animate-in fade-in duration-700">

      {/* HEADER */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center font-black text-white italic text-xl shadow-lg shadow-red-900/20">I</div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic leading-none">IA <span className="text-red-600">INSHAPE</span></h1>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Intelligent Boxing System</p>
          </div>
        </div>
        <button onClick={onLogout} className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest border border-zinc-800 hover:bg-zinc-800 px-3 py-1.5 rounded-lg transition-colors">
          Déconnexion
        </button>
      </div>

      {/* 1. USER MODEL */}
      <section className="glass p-6 rounded-3xl border-l-4 border-l-blue-500">
        <div className="flex items-center justify-between mb-6">
          <h2 className="flex items-center gap-2 font-bold text-zinc-400 text-sm uppercase tracking-widest">
            <User size={18} className="text-blue-500" /> 1. User Model <span className="text-zinc-600 text-[10px] ml-2">(Profil & Paramètres)</span>
          </h2>
          <Settings size={16} className="text-zinc-600 cursor-pointer hover:text-zinc-300 transition-colors" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50">
            <label className="text-[10px] text-zinc-500 uppercase font-bold mb-3 block">Niveau d'Expertise</label>
            <div className="flex gap-2">
              {(['Débutant', 'Avancé'] as Level[]).map(l => (
                <button
                  key={l}
                  onClick={() => setUserModel(prev => ({ ...prev, level: l }))}
                  className={`flex-1 text-xs py-2 px-3 rounded-lg font-bold transition-all ${userModel.level === l ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50 flex items-center">
            <ProgressBar value={userModel.endurance / 100} label="Endurance" color="bg-blue-500" />
          </div>

          <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50 h-full flex flex-col justify-center">
            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Blessures actives</p>
            <p className="text-sm text-zinc-300 font-medium flex items-center gap-2">
              <AlertTriangle size={14} className={userModel.injuries.length > 0 ? "text-yellow-500" : "text-green-500"} />
              {userModel.injuries.length > 0 ? userModel.injuries.join(', ') : 'Aucune blessure'}
            </p>
          </div>
        </div>
      </section>

      {/* 2. REAL-TIME STATS (PREVIEW) */}
      <section className="glass p-6 rounded-3xl border-l-4 border-l-red-500">
        <h2 className="flex items-center gap-2 font-bold text-zinc-400 text-sm uppercase tracking-widest mb-6">
          <TrendingUp size={18} className="text-red-500" /> 2. Previous Session Stats
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 flex flex-col justify-between">
            <Dumbbell className="text-zinc-700 mb-2" size={20} />
            <div>
              <p className="text-3xl font-black italic text-zinc-200">142</p>
              <p className="text-[10px] font-bold text-zinc-500 uppercase">Coups (Dernière Session)</p>
            </div>
          </div>
          <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 flex flex-col justify-between">
            <Flame className="text-zinc-700 mb-2" size={20} />
            <div>
              <p className="text-3xl font-black italic text-zinc-200">84</p>
              <p className="text-[10px] font-bold text-zinc-500 uppercase">Kcal (Dernière Session)</p>
            </div>
          </div>
          <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 flex flex-col justify-between">
            <Clock className="text-zinc-700 mb-2" size={20} />
            <div>
              <p className="text-3xl font-black italic text-zinc-200">12m</p>
              <p className="text-[10px] font-bold text-zinc-500 uppercase">Durée Moyenne</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. VIDEO ANALYSIS LAUNCHER */}
      <main className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 font-bold text-zinc-400 text-sm uppercase tracking-widest px-1">
          <Activity size={18} className="text-green-500" /> 3. Video Analysis <span className="text-zinc-600 text-[10px] ml-2">(Computer Vision)</span>
        </h2>

        <div className="relative aspect-video glass rounded-3xl overflow-hidden accent-glow group border border-zinc-700/50">
          <div className="absolute inset-0 bg-zinc-950 flex items-center justify-center overflow-hidden">
            <div className="text-center z-10 px-8">
              <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6 cursor-pointer hover:scale-110 transition-transform shadow-2xl shadow-red-600/40 ring-4 ring-red-600/20" onClick={toggleSession}>
                <Play className="text-white ml-2" fill="white" size={40} />
              </div>
              <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">Lancer l'Analyse</h3>
              <p className="text-zinc-500 text-sm mt-3 max-w-sm mx-auto font-medium">Le système va activer la caméra et passer en mode plein écran.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center pb-8 opacity-40">
        <p className="text-[10px] uppercase tracking-[0.3em] font-medium text-zinc-500">University Project • Adaptive Interactive Systems 2024</p>
      </footer>
    </div>
  );
};

// --- Main App Controller ---

const App = () => {
  const [currentView, setCurrentView] = useState<'landing' | 'profile-select' | 'mood-select' | 'warmup' | 'onboarding' | 'dashboard'>('landing');
  const [userProfile, setUserProfile] = useState<UserModel>({
    level: 'Débutant',
    endurance: 50,
    injuries: []
  });
  const [availableProfiles, setAvailableProfiles] = useState<UserModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Session State (New)
  const [sessionCredits, setSessionCredits] = useState(0);
  const [currentMood, setCurrentMood] = useState("Normal");

  const MOOD_OPTIONS = [
    { label: "Énergique", icon: "🔥", desc: "Haute Intensité" },
    { label: "Normal", icon: "🙂", desc: "Standard" },
    { label: "Fatigué", icon: "😴", desc: "Relax / Technique" }
  ];

  const handleSignUp = () => setCurrentView('onboarding');

  // Load real profiles from API when clicking "Connexion"
  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const users = await api.fetchUsers();
      setAvailableProfiles(users);
      setCurrentView('profile-select');
    } catch (err) {
      console.error("API Error:", err);
      // Fallback to mock profile if API is down
      setUserProfile({ level: 'Avancé', endurance: 80, injuries: [] });
      setCurrentView('dashboard');
    }
    setIsLoading(false);
  };

  // Select a real profile -> Check Credits -> Go to Mood Select
  const handleProfileSelect = async (profile: UserModel) => {
    setUserProfile(profile);
    setIsLoading(true);
    try {
      if (profile.id) {
        const credits = await api.getCredits(profile.id);
        setSessionCredits(credits.credits_remaining);
      }
      setCurrentView('mood-select');
    } catch (err) {
      console.error("Credit check failed", err);
      setCurrentView('dashboard');
    }
    setIsLoading(false);
  };

  // Mood Selected -> Go to Warmup
  const handleMoodSelect = (mood: string) => {
    setCurrentMood(mood);
    setCurrentView('warmup');
  };

  // Warmup Complete -> Go to Dashboard
  const handleWarmupComplete = () => {
    setCurrentView('dashboard');
  };

  const handleOnboardingComplete = (profile: UserModel) => {
    setUserProfile(profile);
    setCurrentView('dashboard');
  };

  const handleLogout = () => setCurrentView('landing');

  // Profile Selection Screen (NEW)
  if (currentView === 'profile-select') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 animate-in fade-in duration-500">
        <div className="glass p-8 rounded-3xl max-w-md w-full">
          <h2 className="text-2xl font-black italic uppercase text-center mb-2">
            Choisir un Profil
          </h2>
          <p className="text-zinc-500 text-center text-sm mb-6">
            5 boxeurs pré-enregistrés dans la base de données
          </p>

          <div className="space-y-3">
            {availableProfiles.map(profile => (
              <button
                key={profile.id}
                onClick={() => handleProfileSelect(profile)}
                className="w-full flex items-center justify-between p-4 bg-zinc-900/80 hover:bg-zinc-800 rounded-xl border border-zinc-800 hover:border-red-600/50 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center font-black text-white">
                    {profile.name?.charAt(0) || '?'}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-white">{profile.name || `User ${profile.id}`}</p>
                    <p className="text-xs text-zinc-500">
                      {profile.level} • {profile.endurance}% endurance
                      {profile.injuries.length > 0 && ` • ${profile.injuries.join(', ')}`}
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-zinc-600 group-hover:text-red-500 transition-colors" />
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentView('landing')}
            className="w-full mt-6 text-zinc-500 hover:text-white text-sm transition-colors"
          >
            ← Retour
          </button>
        </div>
      </div>
    );
  }

  // Mood Selection Screen (NEW)
  if (currentView === 'mood-select') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 animate-in slide-in-from-right duration-500">
        <div className="glass p-8 rounded-3xl max-w-md w-full text-center">
          <h2 className="text-3xl font-black italic uppercase mb-2">Bonjour {userProfile.name}</h2>
          <p className="text-zinc-400 mb-8">Comment te sens-tu aujourd'hui ?</p>

          <div className="grid grid-cols-1 gap-4 mb-8">
            {MOOD_OPTIONS.map((mood) => (
              <button
                key={mood.label}
                onClick={() => handleMoodSelect(mood.label)}
                className="p-6 rounded-2xl bg-zinc-900/50 hover:bg-zinc-800 border-2 border-transparent hover:border-blue-500 transition-all group"
              >
                <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">{mood.icon}</div>
                <div className="font-bold text-white uppercase tracking-wider">{mood.label}</div>
                <div className="text-[10px] text-zinc-500 font-bold uppercase">{mood.desc}</div>
              </button>
            ))}
          </div>

          <div className="flex justify-center gap-2 text-xs text-zinc-500 font-bold uppercase tracking-widest">
            <Battery size={14} className="text-green-500" />
            Crédits Restants: {sessionCredits}/3
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {currentView === 'landing' && <LandingPage onLogin={handleLogin} onSignUp={handleSignUp} />}
      {currentView === 'onboarding' && <OnboardingWizard onComplete={handleOnboardingComplete} />}
      {currentView === 'warmup' && <WarmupScreen onComplete={handleWarmupComplete} onSkip={handleWarmupComplete} />}
      {currentView === 'dashboard' && <Dashboard onLogout={handleLogout} initialProfile={userProfile} currentMood={currentMood} sessionCredits={sessionCredits} />}
    </>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
