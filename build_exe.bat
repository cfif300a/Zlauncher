@echo off
title Сборка EXE ZLauncher
echo ===================================================
echo     Создание исполняемого файла EXE (ZLauncher)
echo ===================================================
echo.
call npm run dist
if %errorlevel% equ 0 (
    echo.
    echo ===================================================
    echo  EXE успешно создан в папке release/!
    echo ===================================================
) else (
    echo.
    echo Ошибка сборки EXE.
)
pause
