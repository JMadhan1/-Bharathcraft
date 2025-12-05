@echo off
echo ================================================
echo   BHARATCRAFT - GEMINI API SETUP
echo ================================================
echo.

echo Creating .env file with your Gemini API key...
echo.

(
echo # Flask Configuration
echo FLASK_ENV=development
echo SESSION_SECRET=dev-secret-key-bharatcraft-2025
echo HOST=127.0.0.1
echo PORT=5000
echo.
echo # Database Configuration
echo DATABASE_URL=sqlite:///bharatcraft.db
echo.
echo # AI Provider Selection ^(choose: 'openai' or 'gemini'^)
echo AI_PROVIDER=gemini
echo.
echo # Google Gemini API Key
echo GEMINI_API_KEY=AIzaSyBbWDMBkgkLN1pMUIoQOEs_NgdzXKVXc3M
echo.
echo # OpenAI API Key ^(optional - for fallback^)
echo OPENAI_API_KEY=
echo.
echo # Stripe API Keys ^(for payment processing^)
echo STRIPE_SECRET_KEY=
echo STRIPE_PUBLISHABLE_KEY=
) > .env

echo [SUCCESS] .env file created!
echo.
echo Verifying Gemini package installation...
pip show google-generativeai >nul 2>&1
if errorlevel 1 (
    echo [INFO] Installing Gemini package...
    pip install google-generativeai
) else (
    echo [SUCCESS] Gemini package already installed!
)

echo.
echo ================================================
echo   SETUP COMPLETE!
echo ================================================
echo.
echo Your Gemini API is now configured!
echo.
echo Next steps:
echo   1. Run: python app.py
echo   2. Open: http://127.0.0.1:5000
echo   3. Upload a product to test AI quality assessment
echo.
echo You should see in console:
echo   - AI Service initialized with provider: gemini
echo   - Gemini API Key: Configured
echo.
pause

