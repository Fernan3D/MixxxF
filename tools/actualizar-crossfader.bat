@echo off
REM Regenera el PNG del crossfader desde el SVG de Inkscape.
REM MixxxF no pinta bien ese SVG (export de Illustrator/Inkscape);
REM el programa usa slider_crossfader.png.
setlocal
set "INK=C:\Program Files\Inkscape\bin\inkscape.com"
set "DIR=%~dp0..\res\skins\LateNight\palemoon\sliders"
if not exist "%INK%" (
  echo No se encontro Inkscape en:
  echo   %INK%
  exit /b 1
)
"%INK%" "%DIR%\slider_crossfader.svg" --export-filename="%DIR%\slider_crossfader.png" --export-type=png --export-width=460 --export-height=230 --export-background-opacity=0 --export-area-page
if errorlevel 1 exit /b 1
copy /Y "%DIR%\slider_crossfader.png" "%~dp0..\MixxxF\skins\LateNight\palemoon\sliders\slider_crossfader.png" >nul
echo Listo. Cierra MixxxF y vuelvelo a abrir.
exit /b 0
