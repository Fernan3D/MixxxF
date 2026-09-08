@echo off
REM Compila Mixxx y deja el programa listo en D:\MIXXXF\MixxxF
setlocal EnableExtensions
cd /d D:\MIXXXF

echo [%date% %time%] Iniciando compilacion MixxxF
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if errorlevel 1 (
  echo ERROR: vcvars64 fallo
  exit /b 1
)

echo [%date% %time%] Configurando buildenv Release
call "D:\MIXXXF\tools\windows_release_buildenv.bat" setup
if errorlevel 1 (
  echo ERROR: windows_release_buildenv fallo
  exit /b 1
)

echo MIXXX_VCPKG_ROOT=%MIXXX_VCPKG_ROOT%
echo BUILDENV_URL=%BUILDENV_URL%
echo CMAKE_GENERATOR=%CMAKE_GENERATOR%

if not exist "D:\MIXXXF\build-mixxxf" mkdir "D:\MIXXXF\build-mixxxf"
if not exist "D:\MIXXXF\MixxxF" mkdir "D:\MIXXXF\MixxxF"

cd /d D:\MIXXXF\build-mixxxf

echo [%date% %time%] CMake configure
cmake -G Ninja ^
  -DCMAKE_BUILD_TYPE=RelWithDebInfo ^
  -DCMAKE_INSTALL_PREFIX=D:/MIXXXF/MixxxF ^
  -DOPTIMIZE=portable ^
  -DQT6=ON ^
  -DVCPKG_TARGET_TRIPLET=x64-windows-release ^
  -DBATTERY=ON ^
  -DBROADCAST=ON ^
  -DBULK=ON ^
  -DFFMPEG=ON ^
  -DHID=ON ^
  -DHSS1394=ON ^
  -DLOCALECOMPARE=ON ^
  -DLILV=ON ^
  -DMAD=ON ^
  -DMEDIAFOUNDATION=ON ^
  -DMODPLUG=ON ^
  -DOPUS=ON ^
  -DQTKEYCHAIN=ON ^
  -DVINYLCONTROL=ON ^
  -DWAVPACK=ON ^
  -DDEBUG_ASSERTIONS_FATAL=OFF ^
  D:\MIXXXF
if errorlevel 1 (
  echo ERROR: cmake configure fallo
  exit /b 1
)

echo [%date% %time%] Compilando
cmake --build . --parallel
if errorlevel 1 (
  echo ERROR: compilacion fallo
  exit /b 1
)

echo [%date% %time%] Instalando en D:\MIXXXF\MixxxF
cmake --install .
if errorlevel 1 (
  echo ERROR: install fallo
  exit /b 1
)

echo [%date% %time%] Completado
if exist "D:\MIXXXF\MixxxF\mixxx.exe" (
  dir "D:\MIXXXF\MixxxF\mixxx.exe"
) else (
  echo ERROR: no se encontro mixxx.exe en MixxxF
  exit /b 1
)
exit /b 0
