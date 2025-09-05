# 🌐 Custom Domain Setup for ASH AI ERP

## Quick Steps to Use Your Domain

### 🚀 **Method 1: Vercel + Custom Domain (Recommended)**

**Step 1: Deploy to Vercel**
```bash
vercel
```

**Step 2: Add Custom Domain in Vercel**
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings → Domains
4. Click "Add Domain"
5. Enter: `yourdomain.com`
6. Also add: `www.yourdomain.com`

**Step 3: Update DNS at Your Domain Registrar**

Go to your domain provider (GoDaddy, Namecheap, etc.) and add these DNS records:

```
# For main domain (yourdomain.com)
Type: A
Name: @
Value: 76.76.19.61

# For www subdomain
Type: CNAME  
Name: www
Value: cname.vercel-dns.com
```

**Step 4: Update Environment Variables**
In Vercel dashboard → Settings → Environment Variables:
```
NEXTAUTH_URL=https://yourdomain.com
ASH_APP_URL=https://yourdomain.com
```

**Step 5: Redeploy**
```bash
vercel --prod
```

---

### ⚡ **Method 2: Cloudflare Pages (Free SSL + CDN)**

**Step 1: Transfer DNS to Cloudflare**
1. Create account at [cloudflare.com](https://cloudflare.com)
2. Add your domain
3. Update nameservers at your registrar to Cloudflare's:
   ```
   aria.ns.cloudflare.com
   gordon.ns.cloudflare.com
   ```

**Step 2: Setup Pages**
1. Push code to GitHub
2. In Cloudflare → Pages → Create project
3. Connect GitHub repository
4. Build settings:
   - Build command: `npm run build && npx prisma generate`
   - Build output directory: `.next`
   - Root directory: `/`

**Step 3: Environment Variables**
Add in Pages → Settings → Environment Variables:
```
DATABASE_URL=your-database-url
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=https://yourdomain.com
OPENAI_API_KEY=your-openai-key
```

---

### 🏢 **Method 3: Your Own Server/Hosting**

**Step 1: Point Domain to Server**
```
Type: A
Name: @  
Value: YOUR_SERVER_IP

Type: CNAME
Name: www
Value: yourdomain.com
```

**Step 2: Server Setup (Ubuntu/CentOS)**
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone your-repo
cd ash-ai-erp
npm install
npm run build

# Install PM2 for process management
npm install -g pm2
pm2 start npm --name "ash-ai" -- start
pm2 startup
pm2 save
```

**Step 3: SSL Certificate (Free)**
```bash
sudo apt install certbot nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 🔍 **Domain Provider Specific Instructions**

### **GoDaddy**
1. Login → My Products → DNS
2. Add records as shown above
3. TTL: 1 Hour (default)

### **Namecheap**  
1. Domain List → Manage → Advanced DNS
2. Add records
3. TTL: Automatic

### **Google Domains**
1. DNS → Custom records
2. Add A and CNAME records

### **Cloudflare (as registrar)**
1. DNS → Records
2. Add records (proxy status = Proxied)

---

## ⚙️ **Environment Variables for Your Domain**

Update these in your deployment platform:

```env
# Replace with YOUR domain
NEXTAUTH_URL=https://yourdomain.com
ASH_APP_URL=https://yourdomain.com

# Database (use cloud database)
DATABASE_URL=postgresql://user:pass@host:port/database?sslmode=require

# Security (generate strong secrets)
NEXTAUTH_SECRET=your-super-secret-32-character-string
ASH_JWT_SECRET=another-super-secret-32-char-string

# AI Features
OPENAI_API_KEY=sk-your-actual-openai-api-key
ASH_ENABLE_AI_FEATURES=true
```

---

## 🚨 **Common Issues & Solutions**

**DNS Not Updating?**
- Wait 24-48 hours for full propagation
- Check with: `nslookup yourdomain.com`
- Clear browser cache: Ctrl+F5

**SSL Certificate Issues?**
- Make sure both `yourdomain.com` and `www.yourdomain.com` are added
- Wait for DNS propagation before requesting SSL

**Authentication Not Working?**
- Verify `NEXTAUTH_URL` matches your exact domain
- Check HTTPS is enabled
- Clear cookies and try again

**Database Connection Failed?**
- Update `DATABASE_URL` for production database
- Run `npx prisma db push` after deployment

---

## 🎯 **Final Checklist**

- [ ] Domain DNS records updated
- [ ] SSL certificate active (https://)
- [ ] Environment variables set with your domain
- [ ] Database migrated to cloud provider
- [ ] Authentication working
- [ ] AI features enabled (if desired)
- [ ] Production build successful

---

## 💡 **Pro Tips**

1. **Use Cloudflare** for free CDN and DDoS protection
2. **Enable compression** in your platform settings
3. **Setup monitoring** with Vercel Analytics or Google Analytics
4. **Backup strategy** for your database
5. **Custom email** with your domain (Google Workspace, etc.)

Your ASH AI ERP will be live at `https://yourdomain.com` 🚀