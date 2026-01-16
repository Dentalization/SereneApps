# 🚂 Railway Deployment Guide - SereneAI Backend

> **Quick deployment guide for staging environment on Railway**

---

## 📋 **Prerequisites**

- [x] GitHub account
- [x] Railway account (sign up at https://railway.app)
- [x] Code pushed to GitHub repository

---

## 🚀 **Quick Deployment (5 Steps)**

### **Step 1: Create Railway Account**

1. Go to https://railway.app
2. Click "Login with GitHub"
3. Authorize Railway to access your GitHub account

---

### **Step 2: Create New Project**

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose repository: **Dentalization/SereneAI-Web**
4. Select branch: **SereneAI-ADRIANHHALIM-Web**
5. Railway will detect Node.js project automatically

---

### **Step 3: Configure Backend Service**

1. Railway will create a service
2. Click on the service
3. Go to "Settings" tab
4. Set **Root Directory**: `backend`
5. Set **Start Command**: `npm start`

---

### **Step 4: Add PostgreSQL Database**

1. Click "New" in your project
2. Select "Database"
3. Choose "PostgreSQL"
4. Railway will provision a database automatically
5. Get connection string from database settings

---

### **Step 5: Set Environment Variables**

Click on backend service → "Variables" tab → Add all these:

```bash
# Database (Railway auto-generates this)
DATABASE_URL=<from Railway PostgreSQL>

# API Configuration
NODE_ENV=staging
PORT=4000
API_VERSION=v1

# JWT Secrets (generate new ones for staging)
JWT_ACCESS_SECRET=your-staging-access-secret-min-32-chars
JWT_REFRESH_SECRET=your-staging-refresh-secret-min-32-chars

# CORS (your frontend staging URL)
CORS_ORIGINS=https://sereneai-staging.vercel.app,http://localhost:4028

# OTP Configuration
OTP_EXPIRY_MINUTES=5
OTP_LENGTH=6

# Twilio (SMS - use test credentials or skip)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# SendGrid (Email - use test credentials or skip)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@sereneai.com

# Firebase (optional - for push notifications)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email

# Twilio Video (optional - for teleconsult tokens)
TWILIO_VIDEO_API_KEY_SID=your_twilio_video_api_key_sid
TWILIO_VIDEO_API_KEY_SECRET=your_twilio_video_api_key_secret
```

---

## 🔧 **Generate JWT Secrets**

Use this command to generate secure secrets:

```bash
# Generate access secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate refresh secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output to Railway environment variables.

---

## 🗄️ **Database Setup**

### **Option 1: Automatic (Railway CLI)**

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run npm run migrate

# Seed database
railway run npm run seed
```

### **Option 2: Manual (Railway Dashboard)**

1. Get DATABASE_URL from Railway PostgreSQL settings
2. Run migrations locally:

```bash
# Set DATABASE_URL temporarily
export DATABASE_URL="postgresql://user:pass@host:port/db"

# Run migrations
cd backend
npm run migrate

# Seed database
npm run seed
```

---

## 🌐 **Get Your Staging URL**

1. Go to backend service in Railway
2. Click "Settings" tab
3. Scroll to "Domains"
4. Click "Generate Domain"
5. You'll get: `sereneai-backend.up.railway.app`

**Your API will be accessible at:**
```
https://sereneai-backend.up.railway.app/v1
```

**Swagger UI:**
```
https://sereneai-backend.up.railway.app/api-docs
```

---

## ✅ **Verify Deployment**

### **1. Health Check**

```bash
curl https://sereneai-backend.up.railway.app/health
```

**Expected:**
```json
{"ok": true}
```

### **2. Swagger UI**

Open in browser:
```
https://sereneai-backend.up.railway.app/api-docs
```

### **3. Test Registration**

```bash
curl -X POST https://sereneai-backend.up.railway.app/v1/auth/patient/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Patient",
    "email": "test@example.com",
    "password": "SecurePass123",
    "phoneNumber": "+628123456789",
    "dateOfBirth": "1990-01-15",
    "gender": "male"
  }'
```

---

## 🔄 **Auto-Deploy on Git Push**

Railway automatically deploys when you push to GitHub:

```bash
git add .
git commit -m "Update backend"
git push origin SereneAI-ADRIANHHALIM-Web
```

Railway will:
1. Detect the push
2. Build your app
3. Run migrations (if configured)
4. Deploy new version
5. Send notification

---

## 📊 **Monitoring in Railway**

### **View Logs**

1. Click on backend service
2. Go to "Deployments" tab
3. Click on latest deployment
4. View build and runtime logs

### **Metrics**

Railway provides:
- CPU usage
- Memory usage
- Network traffic
- Request count
- Response times

---

## 🐛 **Common Issues**

### **Issue 1: Build Fails**

**Solution:**
```bash
# Check package.json scripts
cat backend/package.json | grep scripts

# Ensure "start" script exists
"scripts": {
  "start": "node src/server.js"
}
```

### **Issue 2: Database Connection Error**

**Solution:**
1. Verify DATABASE_URL is set in environment variables
2. Check PostgreSQL service is running
3. Verify database migrations ran successfully

### **Issue 3: Port Error**

**Solution:**
Railway automatically sets PORT. Update server.js:

```javascript
const port = process.env.PORT || 4000;
```

This is already correct in our codebase.

### **Issue 4: CORS Error**

**Solution:**
Add your frontend staging URL to CORS_ORIGINS:

```bash
CORS_ORIGINS=https://your-frontend.vercel.app,http://localhost:4028
```

---

## 🎯 **Next Steps After Deployment**

1. **Update Mobile Team**
   - Share staging API URL
   - Update Postman collection
   - Test all endpoints

2. **Configure Custom Domain** (Optional)
   - Go to Railway service settings
   - Add custom domain: `api-staging.sereneai.com`
   - Update DNS records as instructed

3. **Set Up Monitoring**
   - Integrate Sentry for error tracking
   - Set up uptime monitoring
   - Configure alerts

4. **Security Checklist**
   - ✅ Use strong JWT secrets
   - ✅ Enable HTTPS only
   - ✅ Set secure CORS origins
   - ✅ Rate limiting active
   - ✅ Input validation enabled

---

## 💰 **Railway Pricing**

**Free Tier:**
- $5 free credit per month
- Perfect for staging environment
- ~550 hours of uptime

**Estimated Costs:**
- Backend service: ~$3-5/month
- PostgreSQL: ~$3-5/month
- **Total: ~$8-10/month** (or free with credits)

---

## 📞 **Support**

**Railway Issues:**
- Docs: https://docs.railway.app
- Discord: https://discord.gg/railway
- Status: https://status.railway.app

**Backend Issues:**
- Check logs in Railway dashboard
- Test locally first
- Review environment variables

---

## 🎉 **Deployment Complete!**

Once deployed, you'll have:

✅ Staging API: `https://sereneai-backend.up.railway.app/v1`  
✅ Swagger UI: `https://sereneai-backend.up.railway.app/api-docs`  
✅ Auto-deploy on git push  
✅ PostgreSQL database  
✅ SSL/HTTPS enabled  
✅ Monitoring dashboard  

**Share with mobile team:**
```
Staging API: https://sereneai-backend.up.railway.app/v1
API Docs: https://sereneai-backend.up.railway.app/api-docs
```

---

**Ready to deploy!** 🚀
