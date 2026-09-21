@echo off
setlocal
title Kalistar V4
echo Ouverture de Kalistar V4...
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File "%~dp0V4\atelier\create-shortcut.ps1"
if errorlevel 1 echo Le raccourci avec icone n'a pas pu etre actualise. Le jeu va tout de meme demarrer.
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File "%~dp0V4\atelier\start.ps1" -View Game
if errorlevel 1 (
    echo.
    echo Impossible de lancer Kalistar. Voir le message ci-dessus.
    pause
    exit /b 1
)
endlocal
