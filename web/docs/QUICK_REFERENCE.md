# 🚀 Quick Reference - SereneAI Staging Deployment

> **One-page guide for quick access to all resources**

---

## 📍 **Quick Links**

| Resource | Local | Staging |
|----------|-------|---------|
| **API Base URL** | `http://localhost:4000/v1` | `https://YOUR_RAILWAY_URL/v1` |
| **Swagger UI** | http://localhost:4000/api-docs | https://YOUR_RAILWAY_URL/api-docs |
| **Health Check** | http://localhost:4000/health | https://YOUR_RAILWAY_URL/health |
| **API Docs JSON** | http://localhost:4000/api-docs.json | https://YOUR_RAILWAY_URL/api-docs.json |

---

## 🔑 **Test Credentials**

```json
{
  "email": "staging@example.com",
  "password": "TestPass123",
  "phone": "+628111222333"
}
```

---

## 📱 **Mobile Resources**

### **Translation Files:**
```
/mobile-translations/en.json  (269+ keys - English)
/mobile-translations/id.json  (269+ keys - Indonesian)
/mobile-translations/README.md (Implementation guide)
```

### **Documentation:**
```
/docs/ERROR_CODE_REFERENCE.md    (40+ error codes)
/docs/API_TESTING_GUIDE.md       (Testing scenarios)
/docs/mobile-api-contract.md     (API contract)
```

### **Postman Collection:**
```
/docs/collections/mobile-api.postman_collection.json
```

---

## 🚂 **Railway Deployment**

### **Step-by-Step Guides:**
```
📖 /docs/COMPLETE_DEPLOYMENT_GUIDE.md  (Comprehensive walkthrough)
📖 /docs/RAILWAY_DEPLOYMENT.md         (Railway-specific)
✅ /docs/DEPLOYMENT_CHECKLIST.md       (Verification checklist)
```

### **Configuration Files:**
```
⚙️ railway.json                    (Railway config)
⚙️ Procfile                        (Process definition)
⚙️ backend/.env.staging.example    (Environment template)
```

### **Quick Commands:**

```bash
# Generate JWT secrets
node scripts/generate-secrets.js

# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Run migrations
railway run npm run migrate

# Seed database
railway run npm run seed
```

---

## ⚡ **Quick Tests**

### **Health Check:**
```bash
curl http://localhost:4000/health
```

### **Register Patient:**
```bash
curl -X POST http://localhost:4000/v1/auth/patient/register \
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

### **Send OTP:**
```bash
curl -X POST http://localhost:4000/v1/auth/send-phone-otp \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+628123456789"}'
```

### **Login:**
```bash
curl -X POST http://localhost:4000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123"
  }'
```

---

## 🔐 **Environment Variables**

### **Required:**
```bash
DATABASE_URL=<from Railway PostgreSQL>
NODE_ENV=staging
PORT=4000
JWT_ACCESS_SECRET=<generate with scripts/generate-secrets.js>
JWT_REFRESH_SECRET=<generate with scripts/generate-secrets.js>
CORS_ORIGINS=https://your-frontend.vercel.app,http://localhost:4028
```

### **Optional (App works without these):**
```bash
TWILIO_ACCOUNT_SID=<for production SMS>
TWILIO_AUTH_TOKEN=<for production SMS>
TWILIO_PHONE_NUMBER=<for production SMS>
SENDGRID_API_KEY=<for emails>
SENDGRID_FROM_EMAIL=<for emails>
```

---

## 🐛 **Common Issues**

| Issue | Solution |
|-------|----------|
| Port 4000 in use | `lsof -ti:4000 \| xargs kill -9` |
| Build fails | Check `package.json`, run `npm install` |
| Database error | Verify `DATABASE_URL`, run migrations |
| CORS error | Add frontend URL to `CORS_ORIGINS` |
| OTP not visible | Check Railway logs for `🔐 [OTP]` |

---

## 📊 **Error Codes**

### **Categories:**
- **1000-1099:** Authentication & Authorization
- **2000-2099:** Appointments & Scheduling
- **3000-3099:** Payments & Billing
- **4000-4099:** Communications (Chat & Video)
- **5000-5099:** Notifications
- **6000-6099:** Profile & User Management
- **7000-7099:** Clinic & Staff Management
- **8000-8099:** File Uploads & Storage
- **9000-9099:** System & Validation Errors

### **Common Errors:**
- **1001:** Email already registered
- **1002:** Invalid credentials
- **1003:** Invalid OTP
- **1004:** OTP expired
- **9001:** Validation error
- **9004:** Rate limit exceeded

**Full Reference:** `/docs/ERROR_CODE_REFERENCE.md`

---

## 📱 **Mobile Implementation**

### **Flutter (easy_localization):**
```dart
import 'package:easy_localization/easy_localization.dart';

// Usage
Text('auth.login.welcome'.tr(args: [userName]))
Text('errors.validation.required'.tr(args: ['email']))
```

### **React Native (react-i18next):**
```javascript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();

// Usage
<Text>{t('auth.login.welcome', { name: userName })}</Text>
<Text>{t('errors.validation.required', { field: 'email' })}</Text>
```

**Full Guide:** `/mobile-translations/README.md`

---

## ✅ **Deployment Checklist**

- [ ] Generate JWT secrets (`node scripts/generate-secrets.js`)
- [ ] Create Railway account (railway.app)
- [ ] Connect GitHub repository
- [ ] Add PostgreSQL database
- [ ] Set environment variables
- [ ] Deploy backend service
- [ ] Run database migrations (`railway run npm run migrate`)
- [ ] Test health endpoint
- [ ] Test Swagger UI
- [ ] Test registration flow
- [ ] Test OTP flow
- [ ] Test login flow
- [ ] Share staging URL with mobile team

---

## 📞 **Support**

### **Documentation:**
- Complete Guide: `/docs/COMPLETE_DEPLOYMENT_GUIDE.md`
- Session Summary: `/docs/SESSION_SUMMARY_FINAL.md`
- Progress Tracking: `/docs/INFRASTRUCTURE_PROGRESS.md`

### **External:**
- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Swagger Docs: https://swagger.io/docs

---

## 🎯 **Success Criteria**

Deployment is successful when:

- ✅ Health check returns `{"ok": true}`
- ✅ Swagger UI loads
- ✅ Registration works
- ✅ OTP sends (check logs)
- ✅ OTP verifies
- ✅ Login returns tokens
- ✅ Error codes work
- ✅ Rate limiting active
- ✅ Mobile team can access

---

## 📦 **Package Scripts**

```json
{
  "start": "node src/server.js",
  "dev": "nodemon src/server.js",
  "migrate": "node src/migrate.js",
  "seed": "node src/seed.js"
}
```

---

## 🔄 **Auto-Deploy**

Railway automatically deploys when you:

```bash
git add .
git commit -m "feat: add feature"
git push origin SereneAI-ADRIANHHALIM-Web
```

Monitor: Railway Dashboard → Deployments

---

## 💰 **Cost Estimate**

- **Development:** Free (Railway credits)
- **Production:** $8-10/month
- **Database:** Included
- **Bandwidth:** Generous free tier

---

## 📅 **Next Steps**

1. Deploy to Railway (~30 mins)
2. Share with mobile team (~5 mins)
3. Monitor for 24 hours
4. Plan production deployment

---

**Status:** ✅ Ready for Deployment  
**Last Updated:** November 10, 2025  
**Estimated Deployment Time:** 30-45 minutes
