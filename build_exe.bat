@echo off
title Сборка EXE ZLauncher
echo ===================================================
echo     Создание исполняемого файла EXE (ZLauncher)
echo ===================================================
echo.
set ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/
call npm run dist:portable
if %errorlevel% equ 0 (
    echo.
    echo ===================================================
    echo  EXE успешно создан: release\ZLauncher 1.0.0.exe
    echo ===================================================
) else (
    echo.
    echo Ошибка сборки EXE.
)
pause
