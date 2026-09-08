@echo off
REM Incorpora los arreglos de Mixxx oficial en la rama MixxxF (custom/mixxxf).
REM No hace push ni abre pull request. Tras un merge limpio, compila y prueba.
setlocal EnableExtensions EnableDelayedExpansion
cd /d D:\MIXXXF

echo [%date% %time%] MixxxF: actualizar desde Mixxx oficial (upstream/main)

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo ERROR: no hay repositorio git en D:\MIXXXF
  exit /b 1
)

for /f "delims=" %%i in ('git status --porcelain') do (
  echo ERROR: hay cambios locales sin confirmar. Guardalos o haz commit antes.
  git status -sb
  exit /b 1
)

echo.
echo Fetch upstream ^(mixxxdj/mixxx^) y origin ^(Fernan3D/MixxxF^)
git fetch upstream
if errorlevel 1 (
  echo ERROR: git fetch upstream fallo
  exit /b 1
)
git fetch origin
if errorlevel 1 (
  echo ERROR: git fetch origin fallo
  exit /b 1
)

echo.
echo Actualizando main como espejo de Mixxx ^(solo fast-forward^)
git checkout main
if errorlevel 1 (
  echo ERROR: no se pudo cambiar a main
  exit /b 1
)
git merge --ff-only upstream/main
if errorlevel 1 (
  echo ERROR: main no pudo avanzar en fast-forward. Revisa la rama main.
  git checkout custom/mixxxf
  exit /b 1
)

echo.
echo Mezclando Mixxx en custom/mixxxf
git checkout custom/mixxxf
if errorlevel 1 (
  echo ERROR: no se pudo cambiar a custom/mixxxf
  exit /b 1
)
git merge --no-edit main
if errorlevel 1 (
  echo.
  echo CONFLICTO: Git ha parado el merge.
  echo 1. Abre los archivos en conflicto, deja el codigo MixxxF donde deba quedarse.
  echo 2. git add de esos archivos
  echo 3. git merge --continue
  echo 4. Ejecuta compilar-MixxxF.bat y prueba en la mesa
  echo 5. git push origin custom/mixxxf
  exit /b 1
)

echo.
echo Merge correcto. Siguiente:
echo   1. compilar-MixxxF.bat
echo   2. Probar pads y DDJ-200
echo   3. git push origin custom/mixxxf
echo   4. git push origin main   ^(opcional, para el espejo en GitHub^)
echo.
echo [%date% %time%] Completado
exit /b 0
