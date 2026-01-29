import React, { useState, useEffect } from 'react';
import { RefreshCw, Calendar, BarChart3 } from 'lucide-react';
import { HistoryEntry } from '../types';
import { api } from '../api';

interface ProgressionTabProps {
  userId: number;
}

export const ProgressionTab = ({ userId }: ProgressionTabProps) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await api.getHistory(userId, 7);
        setHistory(data.history || []);
      } catch (e) {
        console.error("History fetch error:", e);
      }
      setLoading(false);
    };
    fetchHistory();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw size={24} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <Calendar size={32} className="mx-auto mb-3 opacity-50" />
        <p className="font-bold">Pas encore de données</p>
        <p className="text-xs mt-1">Complète ta première session pour voir ta progression !</p>
      </div>
    );
  }

  const maxScore = Math.max(...history.map(h => h.total_score), 1);
  const avgScore = Math.round(history.reduce((sum, h) => sum + h.total_score, 0) / history.length);
  const bestDay = history.reduce((best, h) => h.total_score > best.total_score ? h : best, history[0]);
  const trend = history.length >= 2
    ? history[history.length - 1].total_score - history[history.length - 2].total_score
    : 0;

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800 text-center">
          <p className="text-2xl font-black text-white">{avgScore}</p>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Score Moyen</p>
        </div>
        <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800 text-center">
          <p className={`text-2xl font-black ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {trend >= 0 ? '\u2191' : '\u2193'}{Math.abs(trend)}
          </p>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tendance</p>
        </div>
        <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800 text-center">
          <p className="text-2xl font-black text-yellow-500">{bestDay.total_score}</p>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Meilleur Jour</p>
        </div>
      </div>

      {/* Bar Chart (CSS pure) */}
      <div className="bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={14} className="text-red-500" />
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Scores - 7 derniers jours</span>
        </div>
        <div className="flex items-end justify-between gap-2" style={{ height: '140px' }}>
          {history.map((entry, idx) => {
            const heightPct = (entry.total_score / maxScore) * 100;
            const dayLabel = new Date(entry.date).toLocaleDateString('fr-FR', { weekday: 'short' });
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <span className="text-[10px] font-bold text-zinc-400 tabular-nums">{entry.total_score}</span>
                <div className="w-full rounded-t-md bg-gradient-to-t from-red-600 to-red-400 transition-all duration-700 min-h-[4px]" style={{ height: `${heightPct}%` }} />
                <span className="text-[10px] text-zinc-600 font-medium capitalize">{dayLabel}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-[10px] text-zinc-600 text-center uppercase tracking-widest">
        {history.reduce((sum, h) => sum + h.session_count, 0)} sessions en {history.length} jours
      </div>
    </div>
  );
};
