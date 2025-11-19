# 🎯 Complete Deployment Guide - SereneAI Staging

> **Step-by-step guide from local development to staging deployment**

---

## 📋 **Overview**

This guide covers:
1. ✅ Local testing verification
2. 🚂 Railway staging deployment
3. 📱 Mobile team handoff
4. 🎯 Next steps (monitoring & production)

**Time Required:** ~30-45 minutes

---

## ✅ **Phase 1: Pre-Deployment Verification (5 minutes)**

### **Step 1: Test Backend Locally**

```bash
# 1. Start backend server
cd backend
npm start

# Should see:
# > API listening on :4000
```

### **Step 2: Verify Swagger UI**

Open in browser:
```
http://localhost:4000/api-docs
```

✅ Should see interactive API documentation

### **Step 3: Quick Health Check**

```bash
curl http://localhost:4000/health
```

✅ Should return: `{"ok": true}`

### **Step 4: Test Registration Flow**

```bash
curl -X POST http://localhost:4000/v1/auth/patient/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Local Test",
    "email": "localtest@example.com",
    "password": "TestPass123",
    "phoneNumber": "+628123456789",
    "dateOfBirth": "1990-01-15",
    "gender": "male"
  }'
```

✅ Should return access token

**If all tests pass, you're ready to deploy!** 🎉

---

## 🚂 **Phase 2: Railway Deployment (15 minutes)**

### **Step 1: Generate JWT Secrets**

```bash
node scripts/generate-secrets.js
```

**Save the output!** You'll need these for Railway.

### **Step 2: Create Railway Account**

1. Go to https://railway.app
2. Click "Login with GitHub"
3. Authorize Railway

### **Step 3: Create New Project**

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose: **Dentalization/SereneAI-Web**
4. Select branch: **SereneAI-ADRIANHHALIM-Web**

### **Step 4: Configure Backend Service**

In Railway dashboard:

1. Click on the service that was created
2. Go to "Settings" tab
3. Set **Root Directory**: `backend`
4. Set **Start Command**: `npm start`
5. Click "Save"

### **Step 5: Add PostgreSQL Database**

1. Click "New" in your Railway project
2. Select "Database" → "PostgreSQL"
3. Railway provisions database automatically
4. Click on PostgreSQL service
5. Go to "Variables" tab
6. Copy `DATABASE_URL` value

### **Step 6: Configure Environment Variables**

Go to backend service → "Variables" tab:

**Click "New Variable" for each:**

```bash
DATABASE_URL=<paste from PostgreSQL service>
NODE_ENV=staging
PORT=4000
API_VERSION=v1
JWT_ACCESS_SECRET=<from generate-secrets.js>
JWT_REFRESH_SECRET=<from generate-secrets.js>
CORS_ORIGINS=https://sereneai-staging.vercel.app,http://localhost:4028
OTP_EXPIRY_MINUTES=5
OTP_LENGTH=6
```

**Leave these empty for now (optional):**
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_PHONE_NUMBER
- SENDGRID_API_KEY
- SENDGRID_FROM_EMAIL

💡 **Tip:** App works in dev mode without Twilio/SendGrid. OTP will be logged to Railway console.

### **Step 7: Deploy!**

Railway automatically deploys when you:
- Create the service
- Set environment variables
- Push to GitHub

**Monitor deployment:**
1. Go to "Deployments" tab
2. Watch build logs
3. Wait for "Success" status (2-3 minutes)

### **Step 8: Get Your Staging URL**

1. Go to backend service
2. Click "Settings" tab
3. Scroll to "Networking" → "Public Networking"
4. Click "Generate Domain"
5. Save your URL: `https://sereneai-backend-XXXX.up.railway.app`

---

## 🗄️ **Phase 3: Database Setup (5 minutes)**

### **Option A: Using Railway CLI** (Recommended)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run npm run migrate

# Seed database (optional)
railway run npm run seed
```

### **Option B: Manual via Terminal**

```bash
# Export DATABASE_URL from Railway
export DATABASE_URL="postgresql://user:pass@host:port/db"

# Run migrations
cd backend
npm run migrate

# Seed database (optional)
npm run seed
```

---

## ✅ **Phase 4: Verification (10 minutes)**

Replace `YOUR_RAILWAY_URL` with your actual Railway domain.

### **Test 1: Health Check**

```bash
curl https://YOUR_RAILWAY_URL/health
```

✅ Expected: `{"ok": true}`

### **Test 2: Swagger UI**

Open in browser:
```
https://YOUR_RAILWAY_URL/api-docs
```

✅ Should load interactive API docs

### **Test 3: Patient Registration**

```bash
curl -X POST https://YOUR_RAILWAY_URL/v1/auth/patient/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Staging Test",
    "email": "staging@example.com",
    "password": "TestPass123",
    "phoneNumber": "+628111222333",
    "dateOfBirth": "1990-01-15",
    "gender": "male"
  }'
```

✅ Expected: Returns access token and user object

### **Test 4: Send OTP (Dev Mode)**

```bash
curl -X POST https://YOUR_RAILWAY_URL/v1/auth/send-phone-otp \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+628111222333"}'
```

✅ Expected: Success message

**Check OTP in Railway logs:**
1. Go to Railway dashboard
2. Click on backend service
3. Go to "Deployments" → Latest deployment
4. View logs
5. Search for: `🔐 [OTP]`

### **Test 5: Verify OTP**

```bash
# Use OTP from Railway logs (e.g., 123456)
curl -X POST https://YOUR_RAILWAY_URL/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "+628111222333",
    "otp": "123456"
  }'
```

✅ Expected: Verification success

### **Test 6: Login**

```bash
curl -X POST https://YOUR_RAILWAY_URL/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "staging@example.com",
    "password": "TestPass123"
  }'
```

✅ Expected: Access token and refresh token

### **Test 7: Error Codes**

```bash
# Test validation error
curl -X POST https://YOUR_RAILWAY_URL/v1/auth/patient/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "email": "invalid-email",
    "password": "short",
    "phoneNumber": "123",
    "dateOfBirth": "1990-01-15",
    "gender": "male"
  }'
```

✅ Expected: Error code 9001 with field details

### **Test 8: Rate Limiting**

```bash
# Send 5 OTP requests rapidly
for i in {1..5}; do
  curl -X POST https://YOUR_RAILWAY_URL/v1/auth/send-phone-otp \
    -H "Content-Type: application/json" \
    -d '{"phone_number": "+628111222333"}'
  echo ""
done
```

✅ Expected: 4th request returns error code 9004 (rate limit exceeded)

---

## 📱 **Phase 5: Mobile Team Handoff (5 minutes)**

### **Update Documentation**

Update these files with your staging URL:

```bash
# docs/mobile-api-contract.md
https://YOUR_RAILWAY_URL/v1

# docs/collections/mobile-api.postman_collection.json
"baseUrl": "https://YOUR_RAILWAY_URL/v1"
```

### **Share with Mobile Team**

Send this message:

```
🚀 SereneAI Staging API is Live!

📍 Base URL: https://YOUR_RAILWAY_URL/v1
📚 API Docs: https://YOUR_RAILWAY_URL/api-docs
🔐 Test Account:
   Email: staging@example.com
   Password: TestPass123

📱 Resources:
- Translation Files: /mobile-translations/
- Error Codes: /docs/ERROR_CODE_REFERENCE.md
- Testing Guide: /docs/API_TESTING_GUIDE.md

⚠️ Important Notes:
- OTP is in dev mode (no SMS sent)
- Check API docs for OTP verification
- All endpoints use JWT Bearer authentication
- Rate limiting is active (be mindful of limits)

Happy testing! 🎉
```

### **Mobile Team Checklist**

Share this with mobile team:

- [ ] Update API base URL in mobile app
- [ ] Test registration flow
- [ ] Test OTP flow (check docs for OTP)
- [ ] Test login flow
- [ ] Implement error code handling
- [ ] Add Indonesian translations
- [ ] Test rate limiting scenarios
- [ ] Implement token refresh logic

---

## 🔄 **Phase 6: Auto-Deploy Setup (Already Done!)**

Railway automatically deploys when you push to GitHub:

```bash
git add .
git commit -m "feat: add feature X"
git push origin SereneAI-ADRIANHHALIM-Web
```

Railway will:
1. Detect the push ✅
2. Build your code ✅
3. Run tests (if configured) ✅
4. Deploy new version ✅
5. Notify you ✅

**Monitor deployments:**
- Railway dashboard → Deployments tab
- GitHub Actions (if configured)
- Slack/Discord notifications (optional)

---

## 📊 **Phase 7: Monitoring Setup (Optional - 10 minutes)**

### **Railway Built-in Monitoring**

Railway provides:
- ✅ CPU usage
- ✅ Memory usage
- ✅ Network traffic
- ✅ Deployment history
- ✅ Real-time logs

**Access:** Railway dashboard → Your service → Metrics

### **Sentry Error Tracking** (Recommended for Production)

Will be covered in next session.

---

## 🎯 **Success Criteria**

Deployment is successful when:

- ✅ Health check returns `{"ok": true}`
- ✅ Swagger UI loads successfully
- ✅ Patient registration works
- ✅ OTP sends successfully (logged to console)
- ✅ OTP verification works
- ✅ Login returns valid JWT tokens
- ✅ Error codes work correctly
- ✅ Rate limiting prevents abuse
- ✅ Auto-deploy triggers on git push
- ✅ Mobile team can access API

---

## 🐛 **Common Issues & Solutions**

### **Issue: Build fails with "Cannot find module"**

**Solution:**
```bash
# Check package.json has all dependencies
cd backend
npm install
git add package*.json
git commit -m "fix: update dependencies"
git push
```

### **Issue: Database connection error**

**Solution:**
1. Verify PostgreSQL service is running in Railway
2. Check DATABASE_URL is set correctly
3. Verify database migrations ran:
   ```bash
   railway run npm run migrate
   ```

### **Issue: CORS error from frontend**

**Solution:**
Add frontend URL to CORS_ORIGINS:
```bash
CORS_ORIGINS=https://your-frontend.vercel.app,http://localhost:4028
```

### **Issue: OTP not visible**

**Solution:**
Check Railway logs:
1. Dashboard → Backend service
2. Deployments → Latest
3. Search for `🔐 [OTP]`

### **Issue: Port already in use locally**

**Solution:**
```bash
lsof -ti:4000 | xargs kill -9
```

---

## 📝 **Next Steps**

After successful staging deployment:

1. **Monitor for 24 Hours**
   - Check error rates
   - Monitor resource usage
   - Review logs daily

2. **Mobile Team Integration**
   - Schedule kickoff meeting
   - Demo OTP flow
   - Review error handling
   - Set up testing schedule

3. **Production Planning**
   - Set up Sentry monitoring
   - Configure custom domain
   - Plan production deployment
   - Set up CI/CD pipeline

4. **Documentation**
   - Keep API docs updated
   - Document new features
   - Update mobile team guides

---

## 🎉 **Congratulations!**

Your staging environment is now live! 🚀

**What you've accomplished:**

✅ Deployed backend to Railway  
✅ Configured PostgreSQL database  
✅ Set up environment variables  
✅ Verified all endpoints work  
✅ Enabled auto-deploy  
✅ Ready for mobile team integration  

**Staging URLs:**
- API: https://YOUR_RAILWAY_URL/v1
- Docs: https://YOUR_RAILWAY_URL/api-docs

---

## 📞 **Support**

**Deployment Issues:**
- Railway: https://docs.railway.app
- Discord: https://discord.gg/railway

**Backend Issues:**
- Check logs in Railway dashboard
- Review error code documentation
- Test locally first

**Mobile Integration:**
- Share Swagger documentation
- Provide Postman collection
- Demo OTP flow

---

**Last Updated:** November 10, 2025  
**Status:** ✅ Ready for Deployment  
**Estimated Time:** 30-45 minutes
