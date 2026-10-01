@echo off
REM BB24Market quick start (Windows)
cd /d "%~dp0"

echo Starting BB24Market...
echo.

REM --- find a Python ---
set PY=
where python >nul 2>nul
if not errorlevel 1 set PY=python
if not defined PY (
  where py >nul 2>nul
  if not errorlevel 1 set PY=py -3
)
if not defined PY (
  echo [ERROR] Python was not found on your computer.
  echo Please install Python 3.10+ from https://www.python.org/downloads/
  echo Tick "Add python.exe to PATH" during setup, then run start.bat again.
  pause
  exit /b 1
)

echo Backend setup...
cd backend
if not exist .venv (
  echo Creating Python environment - first run only...
  %PY% -m venv .venv
)
if not exist .venv\Scripts\python.exe (
  echo [ERROR] Could not create the Python environment.
  pause
  exit /b 1
)
call .venv\Scripts\activate.bat
pip install -q -r requirements.txt
if not exist market.db (
  echo Seeding demo data - first run only...
  python seed.py
)
echo Launching backend in a new window - KEEP THAT WINDOW OPEN.
start "BB24Market backend - keep this window open" .venv\Scripts\uvicorn app:app --port 8000
cd ..

echo.
echo Frontend setup...
cd frontend
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found. Install it from https://nodejs.org/ then run start.bat again.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing frontend packages - first run only...
  call npm install
)
echo.
echo Backend:  http://localhost:8000  - docs: http://localhost:8000/docs
echo Starting frontend in this window - KEEP BOTH WINDOWS OPEN.
echo If the app says "Can't reach the server", the backend window was closed.
echo.
call npm run dev -- --port 5173
