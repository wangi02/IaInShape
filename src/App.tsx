import React, { useState } from 'react';
import { ChevronRight, Battery } from 'lucide-react';
import { UserModel } from './types';
import { api } from './api';
import { LandingPage } from './components/LandingPage';
import { OnboardingWizard } from './components/OnboardingWizard';
import { WarmupScreen } from './components/WarmupScreen';
import { Dashboard } from './components/Dashboard';

type View = 'landing' | 'profile-select' | 'mood-select' | 'warmup' | 'onboarding' | 'dashboard';

const MOOD_OPTIONS = [
  { label: "Énergique", icon: "\u{1F525}", desc: "Haute Intensité" },
  { label: "Normal", icon: "\u{1F642}", desc: "Standard" },
  { label: "Fatigué", icon: "\u{1F634}", desc: "Relax / Technique" }
];

export const App = () => {
  const [currentView, setCurrentView] = useState<View>('landing');
  const [userProfile, setUserProfile] = useState<UserModel>({ level: 'Débutant', endurance: 50, injuries: [] });
  const [availableProfiles, setAvailableProfiles] = useState<UserModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionCredits, setSessionCredits] = useState(0);
  const [currentMood, setCurrentMood] = useState("Normal");

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const users = await api.fetchUsers();
      setAvailableProfiles(users);
      setCurrentView('profile-select');
    } catch (err) {
      console.error("API Error:", err);
      setUserProfile({ level: 'Avancé', endurance: 80, injuries: [] });
      setCurrentView('dashboard');
    }
    setIsLoading(false);
  };

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

  // Profile Selection Screen
  if (currentView === 'profile-select') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 animate-in fade-in duration-500">
        <div className="glass p-8 rounded-3xl max-w-md w-full">
          <h2 className="text-2xl font-black italic uppercase text-center mb-2">Choisir un Profil</h2>
          <p className="text-zinc-500 text-center text-sm mb-6">5 boxeurs pré-enregistrés dans la base de données</p>
          <div className="space-y-3">
            {availableProfiles.map(profile => (
              <button key={profile.id} onClick={() => handleProfileSelect(profile)} className="w-full flex items-center justify-between p-4 bg-zinc-900/80 hover:bg-zinc-800 rounded-xl border border-zinc-800 hover:border-red-600/50 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center font-black text-white">{profile.name?.charAt(0) || '?'}</div>
                  <div className="text-left">
                    <p className="font-bold text-white">{profile.name || `User ${profile.id}`}</p>
                    <p className="text-xs text-zinc-500">{profile.level} - {profile.endurance}% endurance{profile.injuries.length > 0 && ` - ${profile.injuries.join(', ')}`}</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-zinc-600 group-hover:text-red-500 transition-colors" />
              </button>
            ))}
          </div>
          <button onClick={() => setCurrentView('landing')} className="w-full mt-6 text-zinc-500 hover:text-white text-sm transition-colors">\u2190 Retour</button>
        </div>
      </div>
    );
  }

  // Mood Selection Screen
  if (currentView === 'mood-select') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 animate-in slide-in-from-right duration-500">
        <div className="glass p-8 rounded-3xl max-w-md w-full text-center">
          <h2 className="text-3xl font-black italic uppercase mb-2">Bonjour {userProfile.name}</h2>
          <p className="text-zinc-400 mb-8">Comment te sens-tu aujourd'hui ?</p>
          <div className="grid grid-cols-1 gap-4 mb-8">
            {MOOD_OPTIONS.map(mood => (
              <button key={mood.label} onClick={() => { setCurrentMood(mood.label); setCurrentView('warmup'); }} className="p-6 rounded-2xl bg-zinc-900/50 hover:bg-zinc-800 border-2 border-transparent hover:border-blue-500 transition-all group">
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
      {currentView === 'landing' && <LandingPage onLogin={handleLogin} onSignUp={() => setCurrentView('onboarding')} />}
      {currentView === 'onboarding' && <OnboardingWizard onComplete={(p) => { setUserProfile(p); setCurrentView('dashboard'); }} />}
      {currentView === 'warmup' && <WarmupScreen onComplete={() => setCurrentView('dashboard')} onSkip={() => setCurrentView('dashboard')} />}
      {currentView === 'dashboard' && <Dashboard onLogout={() => setCurrentView('landing')} initialProfile={userProfile} currentMood={currentMood} sessionCredits={sessionCredits} />}
    </>
  );
};
