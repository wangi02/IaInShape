@echo off
REM ============================================================
REM  IA InShape - Script de demarrage
REM  Lance Backend Flask (port 5001) + Frontend Vite (port 5173)
REM ============================================================

title IA InShape - Demarrage

echo.
echo  ======================================
echo   IA INSHAPE - Coach de Boxe Adaptatif
echo  ======================================
echo.

REM --- Verifier Python ---
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERREUR] Python n'est pas installe ou pas dans le PATH.
    echo Installez Python 3.10+ depuis https://python.org
    pause
    exit /b 1
)

REM --- Verifier Node.js (pour Vite) ---
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERREUR] Node.js n'est pas installe ou pas dans le PATH.
    echo Installez Node.js 18+ depuis https://nodejs.org
    pause
    exit /b 1
)

REM --- Installer dependances Backend ---
echo [1/4] Installation des dependances Backend...
pip install -r backend\requirements.txt --quiet 2>nul
if %ERRORLEVEL% neq 0 (
    echo [WARN] pip install a echoue, tentative de continuer...
)

REM --- Installer dependances Frontend ---
echo [2/4] Installation des dependances Frontend...
if not exist node_modules (
    npm install --silent 2>nul
)

REM --- Initialiser la base de donnees ---
echo [3/4] Initialisation de la base de donnees...
python -m backend.init_db 2>nul

REM --- Verifier que les ports sont libres ---
netstat -aon | findstr :5001 >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [WARN] Le port 5001 est deja utilise. Le backend pourrait echouer.
)

netstat -aon | findstr :5173 >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [WARN] Le port 5173 est deja utilise. Le frontend pourrait echouer.
)

REM --- Lancer Backend Flask en arriere-plan ---
echo [4/4] Demarrage des serveurs...
echo.
echo  Backend  : http://localhost:5001
echo  Frontend : http://localhost:5173 (Vite dev server)
echo.
echo  Appuyez sur Ctrl+C pour tout arreter.
echo  ======================================
echo.

REM Lancer Flask en arriere-plan
start /B "Flask Backend" python -m backend.app

REM Lancer Vite au premier plan (Ctrl+C l'arrete)
npm run dev

REM Si on arrive ici, Vite s'est arrete -> tuer Flask aussi
echo.
echo [INFO] Arret des serveurs...
taskkill /F /FI "WINDOWTITLE eq Flask Backend" >nul 2>&1

REM Tuer les processus Python Flask restants sur le port 5001
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5001 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo [OK] Tous les serveurs sont arretes.
pause
