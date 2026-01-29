import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WarmupExercise {
  id: number;
  name: string;
  icon: string;
  description: string;
  duration: number;
  focus: string;
}

const WARMUP_EXERCISES: WarmupExercise[] = [
  { id: 1, name: "Rotation du Cou", icon: "\u{1F504}", description: "Effectue des cercles lents avec la tête. 10 rotations dans chaque sens.", duration: 30, focus: "Mobilité" },
  { id: 2, name: "Rotation des Épaules", icon: "\u{1F503}", description: "Grands cercles avec les bras tendus. Active tes épaules.", duration: 30, focus: "Épaules" },
  { id: 3, name: "Jumping Jacks", icon: "\u{2B50}", description: "Sauts étoile dynamiques. Réveille ton cardio !", duration: 45, focus: "Cardio" },
  { id: 4, name: "Rotations du Bassin", icon: "\u{1F300}", description: "Cercles avec les hanches. Maintiens l'équilibre.", duration: 30, focus: "Mobilité" },
  { id: 5, name: "Shadow Boxing Léger", icon: "\u{1F94A}", description: "Jabs légers dans le vide. Trouve ton rythme.", duration: 45, focus: "Technique" },
  { id: 6, name: "Étirement Avant-Bras", icon: "\u{1F4AA}", description: "Étend tes bras devant toi, tire tes doigts vers le bas.", duration: 30, focus: "Récupération" },
];

interface WarmupScreenProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const WarmupScreen = ({ onComplete, onSkip }: WarmupScreenProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(WARMUP_EXERCISES[0].duration);
  const [isRunning, setIsRunning] = useState(false);
  const [completedExercises, setCompletedExercises] = useState<number[]>([]);

  const currentExercise = WARMUP_EXERCISES[currentIndex];
  const progress = (currentIndex / WARMUP_EXERCISES.length) * 100;

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
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black italic uppercase tracking-tight mb-2">{'\u{1F525}'} Échauffement</h1>
        <p className="text-zinc-400 text-sm">Prépare ton corps avant l'entraînement</p>
      </div>

      <div className="w-full max-w-md mb-8">
        <div className="flex justify-between text-xs text-zinc-500 mb-2">
          <span>{currentIndex + 1} / {WARMUP_EXERCISES.length}</span>
          <span>{Math.round(progress)}% Complété</span>
        </div>
        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="glass p-8 rounded-3xl max-w-lg w-full text-center border border-zinc-700/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none" />
        <div className="text-7xl mb-6 animate-bounce">{currentExercise.icon}</div>
        <h2 className="text-2xl font-black uppercase mb-3">{currentExercise.name}</h2>
        <p className="text-zinc-400 mb-6 leading-relaxed">{currentExercise.description}</p>
        <div className="inline-block px-4 py-1 bg-zinc-800 rounded-full text-xs font-bold uppercase tracking-widest text-zinc-400 mb-6">{currentExercise.focus}</div>

        <div className="mb-8">
          <div className={`text-5xl font-black tabular-nums ${isRunning ? 'text-orange-500' : 'text-white'}`}>{timeLeft}s</div>
          <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Durée</div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <button onClick={handlePrev} disabled={currentIndex === 0} className="p-3 rounded-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft size={24} />
          </button>
          <button onClick={() => isRunning ? handleExerciseComplete() : setIsRunning(true)} className={`px-8 py-4 rounded-xl font-black uppercase text-lg transition-all ${isRunning ? 'bg-orange-500 hover:bg-orange-400 text-black' : 'bg-white hover:bg-zinc-200 text-black'}`}>
            {isRunning ? 'Terminé \u2713' : 'Démarrer'}
          </button>
          <button onClick={handleNext} disabled={currentIndex === WARMUP_EXERCISES.length - 1} className="p-3 rounded-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      <button onClick={onSkip} className="mt-8 text-zinc-500 hover:text-white text-sm font-medium uppercase tracking-widest transition-colors">
        Passer l'échauffement \u2192
      </button>

      <div className="flex gap-2 mt-8">
        {WARMUP_EXERCISES.map((ex, idx) => (
          <div key={ex.id} className={`w-3 h-3 rounded-full transition-all ${completedExercises.includes(ex.id) ? 'bg-green-500 scale-125' : idx === currentIndex ? 'bg-orange-500 animate-pulse' : 'bg-zinc-700'}`} />
        ))}
      </div>
    </div>
  );
};
