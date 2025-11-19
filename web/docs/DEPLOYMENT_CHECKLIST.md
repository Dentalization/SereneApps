# ✅ Staging Deployment Checklist

> **Use this checklist when deploying to Railway staging**

---

## 🚀 **Pre-Deployment**

- [ ] Code is tested locally
- [ ] All tests passing
- [ ] No console errors
- [ ] Database migrations work
- [ ] `.env.example` updated
- [ ] Documentation complete
- [ ] Code committed to GitHub
- [ ] Branch pushed: `SereneAI-ADRIANHHALIM-Web`

---

## 🚂 **Railway Setup**

- [ ] Railway account created (https://railway.app)
- [ ] GitHub connected to Railway
- [ ] New project created
- [ ] Repository selected: `Dentalization/SereneAI-Web`
- [ ] Branch selected: `SereneAI-ADRIANHHALIM-Web`
- [ ] Root directory set: `backend`
- [ ] Start command set: `npm start`

---

## 🗄️ **Database Setup**

- [ ] PostgreSQL service added to Railway project
- [ ] DATABASE_URL copied from Railway
- [ ] DATABASE_URL set in backend service variables
- [ ] Migrations run successfully
- [ ] Database seeded (optional)

---

## 🔐 **Environment Variables**

Copy from `.env.staging.example` and set in Railway:

### **Required:**
- [ ] `DATABASE_URL` (from Railway PostgreSQL)
- [ ] `NODE_ENV=staging`
- [ ] `PORT=4000`
- [ ] `API_VERSION=v1`
- [ ] `JWT_ACCESS_SECRET` (generate new!)
- [ ] `JWT_REFRESH_SECRET` (generate new!)
- [ ] `CORS_ORIGINS` (your frontend URL)

### **OTP Configuration:**
- [ ] `OTP_EXPIRY_MINUTES=5`
- [ ] `OTP_LENGTH=6`

### **Optional (Can Skip for Now):**
- [ ] `TWILIO_ACCOUNT_SID`
- [ ] `TWILIO_AUTH_TOKEN`
- [ ] `TWILIO_PHONE_NUMBER`
- [ ] `SENDGRID_API_KEY`
- [ ] `SENDGRID_FROM_EMAIL`

**Note:** App works in dev mode without Twilio/SendGrid (OTP logged to Railway logs)

---

## 🌐 **Domain Setup**

- [ ] Railway domain generated
- [ ] Domain copied: `https://sereneai-backend.up.railway.app`
- [ ] Custom domain configured (optional)
- [ ] HTTPS enabled (automatic)

---

## ✅ **Verification**

Test these endpoints:

### **Health Check:**
```bash
curl https://your-railway-domain.up.railway.app/health
```
- [ ] Returns `{"ok": true}`

### **Swagger UI:**
```
https://your-railway-domain.up.railway.app/api-docs
```
- [ ] Loads successfully
- [ ] Shows auth endpoints
- [ ] "Try it out" works

### **Registration:**
```bash
curl -X POST https://your-railway-domain.up.railway.app/v1/auth/patient/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "TestPass123",
    "phoneNumber": "+628123456789",
    "dateOfBirth": "1990-01-15",
    "gender": "male"
  }'
```
- [ ] Returns 201 with access token
- [ ] User created in database

### **Send OTP:**
```bash
curl -X POST https://your-railway-domain.up.railway.app/v1/auth/send-phone-otp \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+628123456789"}'
```
- [ ] Returns success message
- [ ] OTP logged in Railway console (dev mode)

### **Login:**
```bash
curl -X POST https://your-railway-domain.up.railway.app/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123"
  }'
```
- [ ] Returns access token
- [ ] Token is valid JWT

---

## 📱 **Mobile Team Handoff**

- [ ] Share staging API URL with mobile team
- [ ] Share Swagger documentation URL
- [ ] Share test credentials (if any)
- [ ] Update Postman collection with staging URL
- [ ] Send deployment notification

**Message Template:**
```
🚀 Staging API is now live!

API Base URL: https://your-railway-domain.up.railway.app/v1
API Docs: https://your-railway-domain.up.railway.app/api-docs

Test Credentials:
- Email: test@example.com
- Password: TestPass123

Notes:
- OTP is in dev mode (no SMS sent)
- Check API docs for OTP code
- All endpoints documented in Swagger UI

Happy testing! 🎉
```

---

## 📊 **Monitoring Setup**

- [ ] Railway dashboard bookmarked
- [ ] Deployment notifications enabled
- [ ] Error alerts configured
- [ ] Resource usage monitored
- [ ] Uptime monitoring set up (optional)

---

## 🔄 **Auto-Deploy Verification**

Test auto-deployment:

1. Make a small change (e.g., update README)
2. Commit and push to GitHub
3. Check Railway dashboard
- [ ] Deployment triggered automatically
- [ ] Build succeeds
- [ ] New version deployed
- [ ] Health check passes

---

## 🐛 **Troubleshooting**

If deployment fails:

### **Build Errors:**
- [ ] Check Railway build logs
- [ ] Verify package.json scripts
- [ ] Check Node.js version compatibility
- [ ] Verify all dependencies installed

### **Runtime Errors:**
- [ ] Check Railway runtime logs
- [ ] Verify DATABASE_URL is correct
- [ ] Check all environment variables set
- [ ] Verify migrations ran successfully

### **Database Errors:**
- [ ] PostgreSQL service running
- [ ] DATABASE_URL format correct
- [ ] Migrations applied
- [ ] Tables created

### **CORS Errors:**
- [ ] CORS_ORIGINS includes frontend URL
- [ ] Frontend using correct API URL
- [ ] Credentials: true in requests

---

## 📝 **Documentation Updates**

After successful deployment:

- [ ] Update README with staging URL
- [ ] Update API docs with staging endpoint
- [ ] Update mobile team documentation
- [ ] Update Postman collection
- [ ] Create deployment notes

---

## 🎯 **Post-Deployment Tasks**

- [ ] Monitor for 24 hours
- [ ] Check error rates
- [ ] Verify all endpoints working
- [ ] Test with mobile app
- [ ] Collect feedback
- [ ] Plan production deployment

---

## 📅 **Maintenance Schedule**

- [ ] Weekly: Check Railway credits/billing
- [ ] Weekly: Review error logs
- [ ] Monthly: Update dependencies
- [ ] Monthly: Rotate JWT secrets (optional)
- [ ] Quarterly: Review resource usage

---

## ✨ **Success Criteria**

Deployment is successful when:

- ✅ All health checks pass
- ✅ Swagger UI accessible
- ✅ Registration flow works
- ✅ OTP flow works (dev mode)
- ✅ Login returns valid tokens
- ✅ Protected endpoints require auth
- ✅ Error codes return correctly
- ✅ Rate limiting active
- ✅ Auto-deploy working
- ✅ Mobile team can access API

---

**Deployment Status:** 🔴 NOT DEPLOYED

**Once complete, update to:** ✅ DEPLOYED

**Last Deployed:** [Date]  
**Deployed By:** [Name]  
**Railway URL:** [URL]
