// --- API Client centralisé ---

import { UserModel, Level, ContextModel, AdaptationResponse } from './types';

const API_URL = 'http://localhost:5001/api';

export const api = {
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

  async adapt(userId: number, context: ContextModel): Promise<AdaptationResponse> {
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

  async getCredits(userId: number): Promise<{ sessions_today: number; credits_remaining: number }> {
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
  },

  async getHistory(userId: number, days: number = 7): Promise<any> {
    const res = await fetch(`${API_URL}/users/${userId}/history?days=${days}`);
    return res.json();
  },

  async getSmartWorkout(status: string, lastType?: string): Promise<any> {
    let url = `${API_URL}/exercises/smart?status=${encodeURIComponent(status)}`;
    if (lastType) url += `&last_type=${encodeURIComponent(lastType)}`;
    const res = await fetch(url);
    return res.json();
  }
};
