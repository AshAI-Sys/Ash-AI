# 🚀 Deploy Your ASH AI System to Internet

## Step 1: Set Up Your GitHub Repository

### Option A: Create New Repository
1. Go to [GitHub.com](https://github.com) and log in
2. Click "New repository" 
3. Name: `sorbetes-apparel-studio` (or your preferred name)
4. Set as Public
5. Don't initialize with README
6. Click "Create repository"
7. Copy the repository URL

### Option B: Fork Existing Repository
1. Go to: https://github.com/kelvinmorf/ash-ai-apparel-studio
2. Click "Fork" to fork to your account
3. Copy your forked repository URL

## Step 2: Update Git Remote (After creating your repo)

```bash
# Change to your repository
cd "C:\Users\Khell\Desktop\Sorbetes-Apparel-Studio"

# Remove current remote
git remote remove origin

# Add your new repository (replace YOUR-USERNAME and YOUR-REPO-NAME)
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git

# Push to your repository
git push -u origin main
```

## Step 3: Deploy to Vercel

### One-Click Deploy
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Click "Deploy"

### Manual Deploy
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

## Step 4: Configure Environment Variables

In Vercel dashboard, add these environment variables:

```env
DATABASE_URL="postgresql://user:pass@host:5432/db"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="https://your-app.vercel.app"
OPENAI_API_KEY="sk-your-openai-key"
ASH_OPENAI_API_KEY="sk-your-openai-key"
NODE_ENV="production"
```

## Step 5: Set Up Database

### Recommended: Neon (Free PostgreSQL)
1. Go to [neon.tech](https://neon.tech)
2. Create account and new database
3. Copy connection string to `DATABASE_URL`

## 🎉 Your ASH AI System Will Be Live!

Access at: `https://your-app.vercel.app`

### Demo Login:
- Email: `admin@example.com`
- Password: `admin123`

---

**Please provide your GitHub username so I can help you set up the repository!**