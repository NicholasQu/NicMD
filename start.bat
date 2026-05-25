@echo off
chcp 65001 >nul 2>&1
title NicMD Dev Console

echo.
echo  ========================================
echo   NicMD - Development Console
echo  ========================================
echo.
echo   [1] dev        - Local debug (electron-vite dev)
echo   [2] run        - Build + run from out/
echo   [3] pack       - Build + win-unpacked exe
echo   [4] install    - Build + NSIS installer exe
echo   [5] clean      - Remove out/ and dist-*/
echo   [6] push       - Git add + commit + push
echo   [0] exit
echo.

set /p choice="  Select: "

if "%choice%"=="1" goto dev
if "%choice%"=="2" goto run
if "%choice%"=="3" goto pack
if "%choice%"=="4" goto install
if "%choice%"=="5" goto clean
if "%choice%"=="6" goto push
if "%choice%"=="0" exit /b 0
if "%choice%"=="dev" goto dev
if "%choice%"=="run" goto run
if "%choice%"=="pack" goto pack
if "%choice%"=="install" goto install
if "%choice%"=="clean" goto clean
if "%choice%"=="push" goto push

echo  Unknown command: %choice%
pause
exit /b 1

:dev
echo.
echo  [dev] Starting dev server...
call npm run dev
pause
exit /b 0

:run
echo.
echo  [run] Building...
call npm run build
if errorlevel 1 (
  echo  Build failed!
  pause
  exit /b 1
)
echo  [run] Launching from out/...
npx electron .
pause
exit /b 0

:pack
echo.
echo  [pack] Building + packaging win-unpacked...
call npm run build
if errorlevel 1 (
  echo  Build failed!
  pause
  exit /b 1
)
echo  [pack] Copying splash.html...
copy /y src\main\splash.html out\main\ >nul 2>&1
echo  [pack] Running electron-builder (portable)...
npx electron-builder --win --x64 --config.compression=store --config.win.target=portable
echo.
echo  [pack] Done. Check dist\win-unpacked\NicMD.exe
pause
exit /b 0

:install
echo.
echo  [install] Building + packaging NSIS installer...
call npm run build
if errorlevel 1 (
  echo  Build failed!
  pause
  exit /b 1
)
echo  [install] Copying splash.html...
copy /y src\main\splash.html out\main\ >nul 2>&1
echo  [install] Running electron-builder (nsis)...
npx electron-builder --win --x64 --config.win.target=nsis
echo.
echo  [install] Done. Check dist\NicMD-1.0.0-x64.exe
pause
exit /b 0

:clean
echo.
echo  [clean] Removing out/ and dist-*/...
if exist out rmdir /s /q out
for /d %%d in (dist-*) do rmdir /s /q "%%d"
echo  [clean] Done.
pause
exit /b 0

:push
echo.
set /p msg="  Commit message: "
if "%msg%"=="" (
  echo  Empty message, abort.
  pause
  exit /b 1
)
echo  [push] git add -A ...
git add -A
echo  [push] git commit ...
git commit -m "%msg%"
echo  [push] git push ...
git push
echo.
echo  [push] Done.
pause
exit /b 0
