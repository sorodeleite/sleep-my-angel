@echo off
setlocal
set ELECTRON_RUN_AS_NODE=
cd /d "%~dp0"

if not exist "node_modules\electron\dist\electron.exe" (
  echo Instalando dependencias do app...
  call npm install
  if errorlevel 1 (
    echo.
    echo Nao consegui instalar. Confira se o Node.js 22+ esta instalado.
    pause
    exit /b 1
  )
)

echo Abrindo sleep my angel...
"node_modules\electron\dist\electron.exe" .
if errorlevel 1 (
  echo.
  echo O app fechou com erro. Tente rodar "npm start" nesta pasta.
  pause
)
