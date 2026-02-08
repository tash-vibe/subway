@echo off
echo Starting Subway Runner 3D...
echo.

REM Check for Python
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Python found. Starting server...
    echo Open http://localhost:8000 in your browser.
    start http://localhost:8000
    python -m http.server 8000
    goto :eof
)

REM Check for Node.js (npx)
call npx --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Node.js found. Starting server...
    echo Open http://localhost:8080 in your browser.
    start http://localhost:8080
    call npx http-server .
    goto :eof
)

echo.
echo Error: No suitable web server found.
echo Please install Python (https://www.python.org/) or Node.js (https://nodejs.org/).
echo.
pause
