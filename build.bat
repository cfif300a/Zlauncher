@echo off
title Сборка ZLauncher
echo ===================================================
echo     Компиляция ZLauncher (Vite + TypeScript)
echo ===================================================
echo.
call npm run electron:build
if %errorlevel% equ 0 (
    echo.
    echo ===================================================
    echo     Сборка успешно завершена! Запустите start.bat
    echo ===================================================
) else (
    echo.
    echo Ошибка сборки.
)
pause
