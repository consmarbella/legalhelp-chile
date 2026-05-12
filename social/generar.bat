@echo off
title LegalHelp Social Generator
echo =================================
echo  LegalHelp Chile - Social Content
echo =================================
echo.
echo Plataformas disponibles:
echo   instagram  - Instagram carrusel + reel
echo   facebook   - Facebook post
echo   twitter    - Twitter/X post
echo   tiktok     - TikTok script
echo   all        - Todas las plataformas
echo.
set /p platform="Plataforma: "
node src/generate.js %platform%
echo.
pause
