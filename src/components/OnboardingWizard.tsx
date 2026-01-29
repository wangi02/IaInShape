import React, { useState } from 'react';
import { Battery, ChevronRight, CheckCircle, ThumbsUp } from 'lucide-react';
import { UserModel, Level } from '../types';

interface OnboardingWizardProps {
  onComplete: (profile: UserModel) => void;
}

export const OnboardingWizard = ({ onComplete }: OnboardingWizardProps) => {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<UserModel>({
    level: 'Débutant',
    endurance: 50,
    injuries: []
  });

  const nextStep = () => setStep(s => s + 1);

  const toggleInjury = (injury: string) => {
    setProfile(prev => ({
      ...prev,
      injuries: prev.injuries.includes(injury)
        ? prev.injuries.filter(i => i !== injury)
        : [...prev.injuries, injury]
    }));
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
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
              <button onClick={() => { setProfile({ ...profile, level: 'Débutant' }); nextStep(); }} className="group p-6 rounded-2xl bg-zinc-900/50 border border-zinc-700 hover:border-red-500 hover:bg-red-600/10 transition-all text-left">
                <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-2xl">&#x1F423;</div>
                <h3 className="font-bold text-white text-lg mb-1">Jamais boxé</h3>
                <p className="text-xs text-zinc-500 group-hover:text-zinc-300">Je veux apprendre les bases tranquillement.</p>
              </button>
              <button onClick={() => { setProfile({ ...profile, level: 'Avancé' }); nextStep(); }} className="group p-6 rounded-2xl bg-zinc-900/50 border border-zinc-700 hover:border-red-500 hover:bg-red-600/10 transition-all text-left">
                <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-2xl">&#x1F94A;</div>
                <h3 className="font-bold text-white text-lg mb-1">Je connais le job</h3>
                <p className="text-xs text-zinc-500 group-hover:text-zinc-300">J'ai déjà fait des sparrings ou du sac.</p>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: ENDURANCE */}
        {step === 2 && (
          <div className="space-y-6 text-center animate-in fade-in slide-in-from-right-8 duration-300">
            <h2 className="text-3xl font-black italic uppercase text-white">Ton rythme <span className="text-blue-500">Sportif</span> ?</h2>
            <p className="text-zinc-500 text-sm">À quelle fréquence fais-tu du sport en général ?</p>
            <div className="space-y-4 mt-6">
              {[
                { endurance: 30, label: "Tranquille (0-1 fois/sem)", desc: "Je débute ou je reprends, on y va cool.", color: "text-green-500" },
                { endurance: 65, label: "Actif (2-3 fois/sem)", desc: "J'ai une bonne condition physique générale.", color: "text-yellow-500" },
                { endurance: 95, label: "Spartiate (4+ fois/sem)", desc: "Le sport c'est ma vie. Je veux me dépasser.", color: "text-red-500" }
              ].map(opt => (
                <button key={opt.endurance} onClick={() => { setProfile({ ...profile, endurance: opt.endurance }); nextStep(); }} className="w-full p-4 rounded-xl bg-zinc-900/50 border border-zinc-700 hover:bg-zinc-800 flex items-center gap-4 transition-all group">
                  <Battery size={24} className={opt.color} />
                  <div className="text-left">
                    <span className="block font-bold text-white">{opt.label}</span>
                    <span className="text-xs text-zinc-500">{opt.desc}</span>
                  </div>
                  <ChevronRight className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: INJURIES */}
        {step === 3 && (
          <div className="space-y-6 text-center animate-in fade-in slide-in-from-right-8 duration-300">
            <h2 className="text-3xl font-black italic uppercase text-white">Des <span className="text-yellow-500">Bobos</span> à signaler ?</h2>
            <p className="text-zinc-500 text-sm">L'IA évitera les mouvements dangereux pour ces zones.</p>
            <div className="mt-6 mb-8">
              <button
                onClick={() => setProfile(prev => ({ ...prev, injuries: [] }))}
                className={`w-full mb-4 px-6 py-4 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${profile.injuries.length === 0 ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
              >
                <ThumbsUp size={16} /> Rien à signaler, je suis solide !
              </button>
              <div className="flex flex-wrap justify-center gap-3">
                {['Épaules', 'Dos', 'Genoux', 'Poignets', 'Cou'].map(part => (
                  <button key={part} onClick={() => toggleInjury(part)} className={`px-6 py-3 rounded-full text-sm font-bold border transition-all ${profile.injuries.includes(part) ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
                    {part}
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-4 border-t border-zinc-800">
              <button onClick={() => onComplete(profile)} className="w-full bg-white text-black font-black italic uppercase py-4 rounded-xl hover:scale-[1.02] transition-transform shadow-xl flex items-center justify-center gap-2">
                C'est parti ! <CheckCircle size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
