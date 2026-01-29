# Checklist de Validation - IA InShape

## Avant de lancer

1. Python 3.10+ installé (`python --version`)
2. Node.js 18+ installé (`node --version`)
3. Dépendances installées :
   - `pip install -r backend/requirements.txt`
   - `npm install`
4. Base de données initialisée : `python -m backend.init_db`

## Tests de validation

### Backend

- [ ] `get_user_history()` retourne des données correctes :
  ```bash
  python -c "from backend.models.session import get_user_history; print(get_user_history(1, 7))"
  ```

- [ ] Endpoint `/api/users/1/history` répond :
  ```bash
  curl http://localhost:5001/api/users/1/history?days=7
  ```

- [ ] Endpoint `/api/exercises/smart` répond :
  ```bash
  curl "http://localhost:5001/api/exercises/smart?status=Fatigu%C3%A9"
  ```

- [ ] User inexistant retourne 404 :
  ```bash
  curl http://localhost:5001/api/users/999/history
  ```

- [ ] Paramètre days invalide retourne 400 :
  ```bash
  curl http://localhost:5001/api/users/1/history?days=abc
  ```

### Frontend

- [ ] Onglet Progression affiche le bar chart des 7 derniers jours
- [ ] Statistiques affichées : Score moyen, Tendance, Meilleur jour
- [ ] Mini-Workout post-session affiche 3 exercices variés
- [ ] Si "Fatigué" : exercices basse-modérée intensité uniquement
- [ ] Pas d'erreurs dans la console navigateur (F12 > Console)

### Intégration

- [ ] Boucle complète : Landing > Profil > Mood > Échauffement > Dashboard > Training > Rapport
- [ ] Le dashboard affiche les données de progression réelles
- [ ] Le rapport de session affiche les exercices personnalisés
- [ ] Pas d'erreurs console côté Backend (terminal Python)

## Commandes manuelles (si le .bat ne fonctionne pas)

Terminal 1 - Backend :
```bash
python -m backend.app
```

Terminal 2 - Frontend :
```bash
npm run dev
```

Puis ouvrir http://localhost:5173
