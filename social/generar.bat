@echo off
title LegalHelp - Publicidad Automatica
color 0A
cls
echo.
echo ========================================
echo    LegalHelp Chile - Publicidad Auto
echo ========================================
echo.
echo Plataformas disponibles:
echo   1 - Todas (IG + FB + Twitter + TikTok)
echo   2 - Solo Instagram (carrusel + reel)
echo   3 - Solo Facebook
echo   4 - Solo Twitter / X
echo   5 - Solo TikTok
echo.
set /p op="Elegi opcion (1-5): "

if "%op%"=="1" set platform=todas
if "%op%"=="2" set platform=instagram
if "%op%"=="3" set platform=facebook
if "%op%"=="4" set platform=twitter
if "%op%"=="5" set platform=tiktok

echo.
echo Generando contenido para: %platform%
echo.
node src/generate.js %platform%
echo.
echo ────────────────────────────────────────
echo   PUBLICIDAD GENERADA
echo   Carpeta: social/publicidad/
echo   Abri el archivo HTML en tu navegador
echo   para ver el preview de todo.
echo ────────────────────────────────────────
echo.
pause
