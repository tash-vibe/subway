@echo off
echo Pushing code to GitHub...
git push -u origin main
if errorlevel 1 (
    echo.
    echo Push failed! Please check your internet connection or verify your GitHub credentials.
    echo.
) else (
    echo.
    echo Push successful!
    echo.
)
pause
