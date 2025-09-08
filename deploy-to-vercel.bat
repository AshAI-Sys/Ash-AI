@echo off
echo ========================================
echo   ASH AI ERP System - Vercel Deployment
echo ========================================
echo.

echo Step 1: Authenticating with Vercel...
vercel login

echo.
echo Step 2: Deploying to production...
vercel --prod

echo.
echo Step 3: Setting up environment variables...
echo You will need to add these environment variables in Vercel dashboard:
echo - DATABASE_URL (your production database)
echo - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)
echo - NEXTAUTH_URL (your production URL)
echo - OPENAI_API_KEY (your OpenAI API key)
echo - ASH_OPENAI_API_KEY (your OpenAI API key)

echo.
echo ========================================
echo   Deployment Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Visit your Vercel project dashboard
echo 2. Add the required environment variables
echo 3. Redeploy if needed: vercel --prod
echo 4. Test all functionality on production
echo.
pause