# 🚀 ASH AI ERP - Deployment Guide

## Quick Deployment Options

### 🔥 **Option 1: Vercel (Recommended - Fastest)**

#### **Step 1: Setup Database**
Since you're using SQLite locally, you need a cloud database:

**Neon PostgreSQL (Free)**
1. Visit [neon.tech](https://neon.tech)
2. Create account → New Project
3. Get connection string: `postgresql://user:pass@host/db?sslmode=require`
4. Update `DATABASE_URL` in environment variables

**PlanetScale MySQL (Alternative)**
1. Visit [planetscale.com](https://planetscale.com)
2. Create database
3. Get connection string

#### **Step 2: Update Database Provider**
```bash
# Update prisma/schema.prisma datasource
datasource db {
  provider = "postgresql"  # Change from "sqlite"
  url      = env("DATABASE_URL")
}
```

#### **Step 3: Deploy to Vercel**
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (from project root)
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: ash-ai-erp (or your choice)
# - Directory: ./
```

#### **Step 4: Environment Variables**
In Vercel dashboard, add these environment variables:
```
DATABASE_URL=your-neon-postgresql-url
NEXTAUTH_SECRET=your-secure-random-string
NEXTAUTH_URL=https://your-app.vercel.app
OPENAI_API_KEY=your-openai-key
ASH_JWT_SECRET=another-secure-string
```

#### **Step 5: Database Migration**
```bash
# Run database migrations on first deploy
vercel env pull .env.production
npx prisma db push
npx prisma db seed  # If you have seed data
```

---

### 🌊 **Option 2: Railway**

#### **Step 1: Setup**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init
```

#### **Step 2: Deploy**
```bash
# Add PostgreSQL service
railway add postgresql

# Deploy
railway up
```

Railway automatically provides DATABASE_URL and handles environment variables.

---

### ☁️ **Option 3: Netlify**

#### **Step 1: Build Settings**
```bash
# Build command: npm run build
# Publish directory: .next
```

#### **Step 2: Functions**
Netlify requires edge functions for API routes:
```bash
npm install @netlify/plugin-nextjs
```

Add `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

---

### 🐳 **Option 4: Docker + Any Cloud**

#### **Dockerfile** (already created)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

#### **Deploy to:**
- **DigitalOcean App Platform**
- **Google Cloud Run**
- **AWS Fargate**
- **Azure Container Instances**

---

## 🔧 **Environment Variables Needed**

### **Essential (Required)**
```env
DATABASE_URL=postgresql://your-db-url
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
```

### **AI Features**
```env
OPENAI_API_KEY=sk-your-openai-key
ASH_ENABLE_AI_FEATURES=true
```

### **Business Config**
```env
ASH_COMPANY_NAME="Your Company"
ASH_TIMEZONE="Asia/Manila"
ASH_CURRENCY="PHP"
```

---

## 📝 **Pre-Deployment Checklist**

- [ ] Update `DATABASE_URL` to cloud database
- [ ] Change `NEXTAUTH_SECRET` to secure random string
- [ ] Update `NEXTAUTH_URL` to your domain
- [ ] Add real `OPENAI_API_KEY` if using AI features
- [ ] Update Prisma schema provider (sqlite → postgresql)
- [ ] Run `npx prisma db push` after deployment
- [ ] Test authentication flow
- [ ] Verify AI features work with real API key

---

## 🚨 **Security Notes**

1. **Never commit `.env` files** with real secrets
2. **Use strong secrets** for NEXTAUTH_SECRET and JWT_SECRET
3. **Enable HTTPS only** in production
4. **Restrict database access** to your application only
5. **Use environment variables** for all sensitive data

---

## 🎯 **Post-Deployment**

1. **Custom Domain**: Add your domain in platform settings
2. **SSL Certificate**: Usually automatic on modern platforms
3. **Database Backup**: Set up automated backups
4. **Monitoring**: Add error tracking (Sentry, LogRocket)
5. **Performance**: Enable CDN for static assets

---

## 💡 **Cost Estimates (Monthly)**

- **Vercel**: $0 (Hobby) - $20 (Pro)
- **Railway**: $5-20 (usage-based)
- **Netlify**: $0 (Starter) - $19 (Pro)
- **Database (Neon)**: $0-29/month
- **Total**: $0-50/month for small to medium usage

---

## 🆘 **Need Help?**

Common issues:
- **Build fails**: Check Node.js version compatibility
- **Database connection**: Verify DATABASE_URL format
- **Authentication issues**: Check NEXTAUTH_URL and secret
- **AI features not working**: Verify OPENAI_API_KEY

**Quick Fix Commands:**
```bash
# Reset build cache
vercel --prod --force

# Check logs
vercel logs

# Update environment variables
vercel env add DATABASE_URL
```