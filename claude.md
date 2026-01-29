# 🧠 Contexte & Feuille de Route du Projet : IA InShape

Ce document sert de "Source de Vérité" reliant les **Exigences Académiques** (Systèmes Interactifs Adaptatifs) à la **Vision Produit** (Coach de Boxe en Temps Réel).

## 1. Le Concept Central : "La Boxe comme un Quiz"
Pour satisfaire les exigences du projet tout en construisant une app cool, nous mappons les concepts 1:1.

| Concept Académique (Système Quiz) | Notre Implémentation (Coach de Boxe) |
| :--- | :--- |
| **Modèle Utilisateur** | `Endurance` (0-100), `Niveau` (Débutant/Avancé), `Blessures` (ex: genou) |
| **Modèle de Contexte** | `Fatigue` (Déclin de vélocité), `Espace` (FOV Caméra), `PrécisionGarde` |
| **Moteur d'Adaptation** | Moteur de Règles Python (réutilisé de `adaptive_quiz_system`) |
| **"Question"** | Une "Phase de Boxe" générique (ex: Échauffement, Shadow, Technique) |
| **"Réponse"** | Le mouvement physique de l'utilisateur (détecté via MediaPipe) |
| **Feedback** | Correction Audio/Visuelle ("Lève les mains !", "Plus vite !") |

## 2. Vue d'Ensemble de l'Architecture
Nous transformons une **Application Web Transactionnelle** (Flask HTML) en un **Système Réactif Temps Réel**.

-   **Frontend (Le Corps)**: React + MediaPipe. Gère la "Sensation" (Vision) et l'"Actuation" (Affichage/TTS).
-   **Backend (Le Cerveau)**: API Python. Gère la "Cognition" (Décider quoi faire ensuite selon les données).

## 3. Feuille de Route Haut Niveau

### Phase 1 : Fondations (Statut Actuel : 🚧)
-   [x] **Setup Frontend**: React fonctionnant dans le navigateur (via Babel) sans Node.js.
-   [x] **Définition des Skills**: Rôles PM, Ingénieur et Designer définis.
-   [x] **Analyse**: Faisabilité de réutiliser le Backend Quiz confirmée.

### Phase 2 : La "Greffe de Cerveau" (TERMINÉ ✓)
-   [x] **Conversion API**: Transformer `app.py` pour servir du JSON au lieu de HTML.
-   [x] **Modélisation Données**: SQLite stocke `blessures`, `endurance`, et 5 profils de boxeurs.
-   [x] **Injection des Règles**: 13 règles de boxe chargées (fatigue, blessures, garde, espace, temps, niveau).

### Phase 3 : Connexion (TERMINÉ ✓)
-   [x] **Câblage**: Connecter `index.tsx` (Frontend) à `localhost:5001/api/adapt`.
-   [x] **La Boucle**: Implémenter la boucle `Percevoir -> Réfléchir -> Agir` (intervalle 3s).

### Phase 4 : Finition & Livraison
-   [ ] **Raffinement UX**: Validation de l'esthétique "Néon/Dark".
-   [ ] **Scénarios Démo**: Créer des "User Stories" spécifiques pour démontrer l'adaptation (ex: "Le Débutant Blessé").

## 4. Contraintes & Règles Clés
1.  **Pas de Node.js**: Tout doit tourner via Python HTTP + Flask.
2.  **Adaptatif**: Le système DOIT changer son comportement selon le Modèle Utilisateur ET le Contexte.
3.  **Sensation Premium**: Même si c'est un projet académique, l'UI doit avoir l'air professionnelle.
