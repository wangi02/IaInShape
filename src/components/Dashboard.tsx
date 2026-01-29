import React, { useState, useEffect, useRef } from 'react';
import {
  Activity, User, Settings, ShieldCheck, AlertTriangle, Zap,
  Play, ChevronRight, ChevronLeft, TrendingUp, X,
  Dumbbell, Volume2, Scan
} from 'lucide-react';
import { UserModel, ContextModel, Phase, GoalType, CoachState, PHASES_BY_LEVEL } from '../types';
import { api } from '../api';
import { detectJab, detectGuard } from '../utils/pose';
import { playSuccessSound, speak } from '../utils/audio';
import { ProgressBar } from './shared/ProgressBar';
import { ProgressionTab } from './ProgressionTab';

interface DashboardProps {
  onLogout: () => void;
  initialProfile: UserModel;
  currentMood: string;
  sessionCredits: number;
}

export const Dashboard = ({ onLogout, initialProfile, currentMood, sessionCredits }: DashboardProps) => {
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<Phase>('Échauffement');
  const [userModel, setUserModel] = useState<UserModel>(initialProfile);
  const [context, setContext] = useState<ContextModel>({
    space: 'Optimal',
    fatigue: 0.1,
    timeRemaining: 30,
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

  // Gamification State
  const [currentGoal, setCurrentGoal] = useState<GoalType>('guard');
  const [liveScore, setLiveScore] = useState(0);
  const [showSuccessFlash, setShowSuccessFlash] = useState(false);
  const lastDetectionRef = useRef<number>(0);
  const liveScoreRef = useRef<number>(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const goalLabels: Record<GoalType, string> = {
    'guard': '\u{1F6E1}\uFE0F GARDE HAUTE !',
    'jab_left': '\u{1F94A} JAB GAUCHE !',
    'jab_right': '\u{1F94A} JAB DROIT !',
    'hook_left': '\u{1F4A5} CROCHET GAUCHE !',
    'hook_right': '\u{1F4A5} CROCHET DROIT !',
    'rest': '\u{1F9D8} RÉCUPÈRE...'
  };

  // --- Timer & Session End ---
  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(() => {
      setContext(prev => {
        const newTime = Math.max(0, prev.timeRemaining - 1);
        if (newTime === 0) {
          handleSessionEnd();
          return { ...prev, timeRemaining: 0 };
        }
        return { ...prev, timeRemaining: newTime, fatigue: Math.min(1, prev.fatigue + 0.0005) };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive]);

  const handleSessionEnd = async () => {
    const finalScore = liveScoreRef.current;
    setIsActive(false);
    setIsSessionComplete(true);
    setSessionScore(finalScore);

    if (sessionId) {
      await api.completeSession(sessionId, finalScore);
    }

    // Fetch smart mini-workout (3 exercises, varied types)
    const workoutExercises: any[] = [];
    let lastType: string | undefined;
    for (let i = 0; i < 3; i++) {
      const res = await api.getSmartWorkout(currentMood, lastType);
      if (res.exercise && res.exercise.name) {
        workoutExercises.push(res.exercise);
        lastType = res.exercise.type;
      }
    }
    setMiniWorkout(workoutExercises);
  };

  // --- Adaptation API Loop ---
  useEffect(() => {
    const allowedPhases = PHASES_BY_LEVEL[userModel.level];
    if (!allowedPhases.includes(phase)) {
      setPhase(allowedPhases[0]);
    }
    if (!isActive || !userModel.id) return;

    const adaptInterval = setInterval(async () => {
      try {
        const response = await api.adapt(userModel.id!, context);
        if (response.phase && allowedPhases.includes(response.phase as Phase)) {
          setPhase(response.phase as Phase);
        }
        if (response.instruction) setMainInstruction(response.instruction);
        if (response.sub_feedback) setSubFeedback(response.sub_feedback);
        if (response.alerts && response.alerts.length > 0) setCoachState('CORRECTION');
      } catch (err) {
        console.error("Adaptation API Error:", err);
      }
    }, 3000);

    return () => clearInterval(adaptInterval);
  }, [context.fatigue, context.guardAccuracy, userModel.id, userModel.level, isActive, phase]);

  // --- TTS Trigger ---
  useEffect(() => {
    if (!isActive) { window.speechSynthesis.cancel(); return; }
    if (coachState !== 'CALIBRATING') speak(mainInstruction);
  }, [mainInstruction, isActive, coachState]);

  // --- Fluid Feedback Loop ---
  useEffect(() => {
    if (!isActive) { setCoachState('CALIBRATING'); setCalibrationProgress(0); return; }

    if (coachState === 'CALIBRATING') {
      setMainInstruction("Scan de l'environnement...");
      const interval = setInterval(() => {
        setCalibrationProgress(prev => {
          if (prev >= 100) { clearInterval(interval); setCoachState('INSTRUCTION'); speak("Analyse terminée. C'est parti pour l'entraînement."); return 100; }
          return prev + 5;
        });
      }, 100);
      return () => clearInterval(interval);
    }

    if (coachState === 'INSTRUCTION') {
      if (mainInstruction === "Scan de l'environnement...") setMainInstruction(goalLabels['guard']);
      const triggerCorrection = setTimeout(() => setCoachState('CORRECTION'), Math.random() * 4000 + 8000);
      return () => clearTimeout(triggerCorrection);
    }

    if (coachState === 'CORRECTION') {
      const errors = ["Garde trop basse !", "Coudes trop écartés", "Rotation hanche manquante", "Menton exposé"];
      setMainInstruction(errors[Math.floor(Math.random() * errors.length)]);
      setSubFeedback("Corrige ta posture immédiatement.");
      const returnToInstruction = setTimeout(() => {
        setCoachState('INSTRUCTION');
        setMainInstruction(goalLabels[currentGoal]);
        setSubFeedback("C'est mieux. On reprend.");
      }, 3500);
      return () => clearTimeout(returnToInstruction);
    }
  }, [isActive, coachState, phase, currentGoal]);

  // --- Camera & MediaPipe ---
  useEffect(() => {
    if (!isActive) return;
    let camera: any = null;
    let pose: any = null;

    const onResults = (results: any) => {
      if (!canvasRef.current || !videoRef.current) return;
      const canvasCtx = canvasRef.current.getContext('2d');
      if (!canvasCtx) return;

      if (canvasRef.current.width !== videoRef.current.videoWidth) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
      }

      const width = canvasRef.current.width;
      const height = canvasRef.current.height;

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, width, height);
      canvasCtx.drawImage(results.image, 0, 0, width, height);

      if (results.poseLandmarks) {
        if (window.drawConnectors) window.drawConnectors(canvasCtx, results.poseLandmarks, window.POSE_CONNECTIONS, { color: '#06b6d4', lineWidth: 4 });
        if (window.drawLandmarks) window.drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#ef4444', lineWidth: 2, radius: 4 });

        // Gamification: Check goal
        const now = Date.now();
        if (now - lastDetectionRef.current > 1500) {
          const jabDetected = detectJab(results.poseLandmarks);
          const guardDetected = detectGuard(results.poseLandmarks);
          let goalAchieved = false;

          if (currentGoal === 'jab_left' && jabDetected === 'left') goalAchieved = true;
          if (currentGoal === 'jab_right' && jabDetected === 'right') goalAchieved = true;
          if (currentGoal === 'guard' && guardDetected) goalAchieved = true;

          if (goalAchieved) {
            lastDetectionRef.current = now;
            liveScoreRef.current += 1;
            setLiveScore(liveScoreRef.current);
            setShowSuccessFlash(true);
            playSuccessSound();
            setTimeout(() => setShowSuccessFlash(false), 300);

            const goals: GoalType[] = userModel.level === 'Débutant'
              ? ['guard', 'jab_right', 'jab_left']
              : ['guard', 'jab_right', 'jab_left', 'hook_left', 'hook_right'];
            const nextGoal = goals[Math.floor(Math.random() * goals.length)];
            setCurrentGoal(nextGoal);
            setMainInstruction(goalLabels[nextGoal]);
            setSubFeedback('Bravo ! Continue \u{1F525}');
          }
        }
      }
      canvasCtx.restore();
    };

    const setupMediaPipe = async () => {
      if (!window.Pose || !window.Camera) { console.error("MediaPipe scripts not loaded"); return; }
      pose = new window.Pose({ locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
      pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, enableSegmentation: false, smoothSegmentation: false, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
      pose.onResults(onResults);
      if (videoRef.current) {
        camera = new window.Camera(videoRef.current, { onFrame: async () => { if (pose && videoRef.current) await pose.send({ image: videoRef.current }); }, width: 1280, height: 720 });
        camera.start();
      }
    };
    setupMediaPipe();
    return () => { if (camera) camera.stop(); if (pose) pose.close(); };
  }, [isActive]);

  const handlePhaseChange = (direction: 'next' | 'prev') => {
    const allowed = PHASES_BY_LEVEL[userModel.level];
    const currentIndex = allowed.indexOf(phase);
    const newIndex = direction === 'next' ? (currentIndex + 1) % allowed.length : (currentIndex - 1 + allowed.length) % allowed.length;
    setPhase(allowed[newIndex]);
    setCoachState('INSTRUCTION');
  };

  const toggleSession = async () => {
    if (!isActive) {
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

  // ==================== RENDERING ====================

  // 1. SESSION REPORT
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
                    <Dumbbell size={20} className="text-zinc-500" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-white">{ex.name}</div>
                    <div className="text-xs text-zinc-500">{ex.description || "Exercice"} - {ex.duration_seconds}s</div>
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 border-zinc-700 hover:bg-green-500 hover:border-green-500 cursor-pointer transition-colors" />
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => setIsSessionComplete(false)} className="w-full bg-white text-black font-black uppercase py-4 rounded-xl hover:scale-[1.02] transition-transform">
            Retour au Dashboard
          </button>
        </div>
      </div>
    );
  }

  // 2. IMMERSIVE TRAINING MODE
  if (isActive) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex text-white overflow-hidden">
        {showSuccessFlash && <div className="absolute inset-0 z-[100] bg-green-500/30 pointer-events-none animate-pulse" />}

        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-zinc-700">
          <Zap size={20} className="text-yellow-500" />
          <span className="text-2xl font-black tabular-nums">{liveScore}</span>
          <span className="text-xs text-zinc-400 uppercase tracking-widest font-bold">Points</span>
        </div>

        <video ref={videoRef} className="hidden" playsInline muted />

        <div className="absolute inset-0 z-0">
          <div className="w-full h-full bg-zinc-900 relative">
            <canvas ref={canvasRef} className="w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
          </div>
        </div>

        {/* Top Bar */}
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

        {/* Bottom Nav */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 group">
          <button onClick={() => handlePhaseChange('prev')} className="p-3 rounded-full bg-black/20 hover:bg-black/80 text-white/50 hover:text-white backdrop-blur-sm transition-all hover:scale-110 border border-white/5 hover:border-white/20">
            <ChevronLeft size={20} />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase text-zinc-400 tracking-widest font-bold mb-1">Phase Actuelle</span>
            <div className="px-6 py-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-lg font-black italic uppercase min-w-[200px] text-center shadow-lg">{phase}</div>
          </div>
          <button onClick={() => handlePhaseChange('next')} className="p-3 rounded-full bg-black/20 hover:bg-black/80 text-white/50 hover:text-white backdrop-blur-sm transition-all hover:scale-110 border border-white/5 hover:border-white/20">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Right Sidebar */}
        <div className="absolute top-0 bottom-0 right-0 w-80 md:w-96 glass border-l border-zinc-700/50 z-20 flex flex-col p-6 animate-in slide-in-from-right duration-700">
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
                  <h2 className={`text-3xl font-black italic uppercase leading-none mb-2 ${coachState === 'CORRECTION' ? 'text-yellow-400' : 'text-white'}`}>{mainInstruction}</h2>
                  <p className="text-sm text-zinc-400 font-medium">{subFeedback}</p>
                </div>
              )}
            </div>
          </div>

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

          <button onClick={toggleSession} className="mt-6 w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase py-4 rounded-xl transition-colors flex items-center justify-center gap-2">
            <X size={18} /> Arrêter la session
          </button>
        </div>
      </div>
    );
  }

  // 3. DASHBOARD (PRE-SESSION)
  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto flex flex-col gap-6 animate-in fade-in duration-700">
      {/* Header */}
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

      {/* 1. User Model */}
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
              {(['Débutant', 'Avancé'] as const).map(l => (
                <button key={l} onClick={() => setUserModel(prev => ({ ...prev, level: l }))} className={`flex-1 text-xs py-2 px-3 rounded-lg font-bold transition-all ${userModel.level === l ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}>
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

      {/* 2. Progression */}
      <section className="glass p-6 rounded-3xl border-l-4 border-l-red-500">
        <h2 className="flex items-center gap-2 font-bold text-zinc-400 text-sm uppercase tracking-widest mb-6">
          <TrendingUp size={18} className="text-red-500" /> 2. Progression <span className="text-zinc-600 text-[10px] ml-2">(7 derniers jours)</span>
        </h2>
        {userModel.id && <ProgressionTab userId={userModel.id} />}
      </section>

      {/* 3. Video Analysis Launcher */}
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

      <footer className="text-center pb-8 opacity-40">
        <p className="text-[10px] uppercase tracking-[0.3em] font-medium text-zinc-500">University Project - Adaptive Interactive Systems 2024</p>
      </footer>
    </div>
  );
};
