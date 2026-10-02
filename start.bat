@echo off
title ZLauncher - Minecraft
echo ===================================================
echo     Запуск ZLauncher - Minecraft (Pirate Edition)
echo ===================================================
echo.
npx electron .
if %errorlevel% neq 0 (
    echo.
    echo Ошибка при запуске. Убедитесь, что зависимости установлены (npm install).
    pause
)
