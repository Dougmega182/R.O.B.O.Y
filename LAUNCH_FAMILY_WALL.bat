@echo off
title Psaila Family Command Center
echo.
echo  [1] Standard Launch
echo  [2] Clean Launch (Fixes 404/Sync Issues)
echo.
set /p choice="Select Boot Mode [1-2]: "

if "%choice%"=="2" (
    echo Launching with Clean Mode...
    powershell -NoProfile -ExecutionPolicy Bypass -File "launch_command_center.ps1" --clean
) else (
    echo Launching Standard Node...
    powershell -NoProfile -ExecutionPolicy Bypass -File "launch_command_center.ps1"
)
pause
