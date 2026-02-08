@echo off
echo Starting Subway Runner 3D...
echo.

REM Check for Python
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Python found. Starting server...
    if exist server.py (
        echo Using custom server.py to handle MIME types correctly...
        start http://localhost:8081
        python server.py 8081
    ) else (
        echo Open http://localhost:8081 in your browser.
        start http://localhost:8081
        python -m http.server 8081
    )
    goto :eof
)

REM Check for Node.js (npx)
call npx --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Node.js found. Starting server...
    echo Open http://localhost:8081 in your browser.
    start http://localhost:8081
    call npx http-server .
    goto :eof
)

echo.
echo Error: No suitable web server found.
echo Please install Python (https://www.python.org/) or Node.js (https://nodejs.org/).
echo.
pause
