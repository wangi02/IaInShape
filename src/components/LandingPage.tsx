import React, { useState } from 'react';
import {
  Target, Activity, ShieldCheck, Github,
  Lock, Mail, ArrowRight
} from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
  onSignUp: () => void;
}

export const LandingPage = ({ onLogin, onSignUp }: LandingPageProps) => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-zinc-950 flex relative overflow-hidden">
      {/* BRANDING BACKGROUND */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-no-repeat transition-opacity duration-1000 ease-in-out"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1615117970176-65bbe41164a6?q=80&w=2070&auto=format&fit=crop')`,
          backgroundPosition: 'center 20%',
          filter: 'brightness(1.1) contrast(1.1)'
        }}
      >
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
      </div>

      <div className="container mx-auto max-w-6xl p-6 flex flex-col md:flex-row items-center gap-12 relative z-10">
        {/* Left: Branding */}
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
            <div className="absolute -top-6 -right-6 w-12 h-12 bg-red-600 text-white flex items-center justify-center rounded-full font-black text-xl italic shadow-lg animate-bounce">!</div>

            <div className="mb-8 text-center">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">
                {isLogin ? 'Connexion' : 'Rejoindre la Team'}
              </h2>
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-2">Accès au Dashboard</p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input type="email" placeholder="Email étudiant" className="w-full bg-zinc-900/60 border border-zinc-700 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-red-500 transition-colors placeholder:text-zinc-600" />
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input type="password" placeholder="Mot de passe" className="w-full bg-zinc-900/60 border border-zinc-700 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-red-500 transition-colors placeholder:text-zinc-600" />
              </div>

              <button
                onClick={() => isLogin ? onLogin() : onSignUp()}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black italic uppercase py-4 rounded-xl shadow-lg shadow-red-900/20 transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
              >
                {isLogin ? "S'entrainer" : "Créer mon profil"} <ArrowRight size={18} />
              </button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800"></div></div>
                <div className="relative flex justify-center"><span className="bg-black/80 px-4 text-xs text-zinc-500 font-medium uppercase">Ou</span></div>
              </div>

              <button onClick={onSignUp} className="w-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 font-bold uppercase py-3 rounded-xl border border-zinc-700 transition-all text-xs tracking-widest">
                Continuer en invité
              </button>
            </div>

            <div className="mt-6 text-center">
              <button onClick={() => setIsLogin(!isLogin)} className="text-xs text-zinc-500 hover:text-red-500 underline transition-colors">
                {isLogin ? "Pas encore de compte ? S'inscrire" : "Déjà membre ? Se connecter"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 w-full p-4 border-t border-zinc-800/50 flex justify-between items-center text-[10px] text-zinc-600 font-medium uppercase tracking-[0.2em] bg-black/60 backdrop-blur-md">
        <span>Université Paris - AIS Project</span>
        <span>v0.9.2-beta</span>
      </div>
    </div>
  );
};
