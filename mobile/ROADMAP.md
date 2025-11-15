# 🗺️ Development Roadmap - SereneAI Dental Patient App

## Current Status: ✅ Foundation Complete (Phase 1)

---

## Phase 1: Foundation & Core Architecture ✅ COMPLETE

### What's Done:
- [x] Project setup with Expo SDK 51
- [x] Complete folder structure (feature-first)
- [x] Redux store with 4 slices (auth, cart, ai, settings)
- [x] Redux Persist for offline support
- [x] Navigation (Tab + 5 Stack navigators)
- [x] Theme system (Light/Dark mode, MD3)
- [x] API client with interceptors
- [x] Validation schemas (Zod)
- [x] Utility functions (formatters, validators)
- [x] Shared components library
- [x] All 5 tabs rendering with navigation
- [x] Guest mode default state
- [x] Auth guard modal component

### Key Files Created: 60+ files
- App.js - Main entry
- 5 navigators
- 20+ screens (functional placeholders)
- 5 Redux slices
- 6 shared components
- Theme configuration
- API services layer

---

## Phase 2: Appointment Feature 🔨 NEXT UP

### Priority: HIGH
### Estimated Time: 2-3 days

### Tasks:

#### 2.1 Clinic Detail Screen
- [ ] Fetch clinic data from API
- [ ] Display clinic info (name, address, hours)
- [ ] Show dentist list with avatars
- [ ] Add image carousel
- [ ] Show reviews and ratings
- [ ] "Pilih Dokter" button for each dentist
- [ ] Map integration (optional)

#### 2.2 Dentist Detail Screen
- [ ] Fetch dentist profile
- [ ] Display specialties and experience
- [ ] Show availability calendar
- [ ] Reviews section
- [ ] "Buat Janji" CTA
- [ ] Check authLevel before proceeding

#### 2.3 Booking Slot Screen
- [ ] Calendar picker (react-native-calendars)
- [ ] Fetch available slots from API
- [ ] Time slot grid (morning/afternoon/evening)
- [ ] Appointment type selector
- [ ] Reason text input
- [ ] Notes (optional)
- [ ] "Lanjutkan" button

#### 2.4 Booking Confirm Screen
- [ ] Summary card (dentist, clinic, date, time)
- [ ] Patient info display
- [ ] Medical alerts if any
- [ ] Terms checkbox
- [ ] "Konfirmasi Booking" button
- [ ] POST to /api/mobile/appointments
- [ ] Success modal with details
- [ ] Navigate to appointment list

#### 2.5 Appointment List Enhancement
- [ ] Fetch appointments from API
- [ ] Tab switcher (Upcoming/Past/Cancelled)
- [ ] Appointment cards with status
- [ ] Pull to refresh
- [ ] Skeleton loading
- [ ] Empty state per tab
- [ ] Swipe actions (Cancel, Reschedule)

**API Endpoints Needed:**
```
GET /api/mobile/clinics/:id
GET /api/mobile/dentists/:id
GET /api/mobile/dentists/:id/availability?date=YYYY-MM-DD
POST /api/mobile/appointments
GET /api/mobile/appointments
```

---

## Phase 3: Authentication Screens 🔐

### Priority: HIGH
### Estimated Time: 2-3 days

### Tasks:

#### 3.1 OTP Screen
- [ ] Phone number input (+62 format)
- [ ] Validation with phoneSchema
- [ ] "Kirim Kode" button
- [ ] POST /api/auth/otp/send
- [ ] 6-digit OTP input
- [ ] Countdown timer (60s)
- [ ] Resend OTP button
- [ ] POST /api/auth/otp/verify
- [ ] Update Redux auth state to OTP_VERIFIED
- [ ] Navigate based on context (booking vs settings)

#### 3.2 Login Screen
- [ ] Email input with validation
- [ ] Password input with show/hide
- [ ] "Lupa Password?" link
- [ ] "Masuk" button
- [ ] POST /api/auth/login
- [ ] Store tokens in AsyncStorage
- [ ] Update Redux auth to FULL_ACCOUNT
- [ ] Navigate to previous screen or Dashboard

#### 3.3 Register Screen (Multi-step)
- [ ] Step 1: Basic Info (name, email, password, phone, DOB, gender)
- [ ] Step 2: Medical Info (allergies, conditions, medications)
- [ ] Step 3: Emergency Contact (name, phone, relationship)
- [ ] Step 4: Insurance (optional)
- [ ] Progress indicator
- [ ] Validation per step
- [ ] "Lanjut" / "Kembali" buttons
- [ ] POST /api/auth/patient/register
- [ ] Auto-login after registration
- [ ] Welcome modal

#### 3.4 Profile Screen
- [ ] Fetch current profile
- [ ] Edit mode toggle
- [ ] Profile photo upload
- [ ] Form fields (name, email, phone, DOB, gender)
- [ ] Medical info section (expandable)
- [ ] Emergency contact section
- [ ] Insurance info section
- [ ] "Simpan Perubahan" button
- [ ] PUT /api/mobile/profile

**API Endpoints:**
```
POST /api/auth/otp/send
POST /api/auth/otp/verify
POST /api/auth/login
POST /api/auth/patient/register
GET /api/mobile/profile
PUT /api/mobile/profile
```

---

## Phase 4: AI Diagnosis Integration 🧠

### Priority: MEDIUM
### Estimated Time: 2-4 days

### Tasks:

#### 4.1 Backend Integration
- [ ] Image upload to server
- [ ] POST /api/mobile/ai-diagnosis/upload (FormData)
- [ ] Get signed URLs or upload to S3
- [ ] POST /api/mobile/ai-diagnosis/analyze
- [ ] Handle analysis response
- [ ] Save to Redux ai.history
- [ ] Persist to AsyncStorage

#### 4.2 Result Enhancement
- [ ] Parse API response
- [ ] Display risk level with proper colors
- [ ] Show confidence percentage
- [ ] Affected teeth visualization
- [ ] Condition cards with severity
- [ ] Recommendations section
- [ ] Share result (screenshot)
- [ ] Save to profile (requires full account)

#### 4.3 History Screen
- [ ] Fetch from local storage first
- [ ] Sync with server if online
- [ ] List view with thumbnails
- [ ] Filter by date range
- [ ] Risk level filter
- [ ] Tap to view details
- [ ] Delete confirmation
- [ ] Compare results (side by side)

#### 4.4 Client-side Validation
- [ ] Check image size (max 10MB)
- [ ] Validate image format (jpg, png)
- [ ] Basic blur detection
- [ ] Lighting check (brightness)
- [ ] Show warnings before upload

**API Endpoints:**
```
POST /api/mobile/ai-diagnosis/upload
POST /api/mobile/ai-diagnosis/analyze
GET /api/mobile/ai-diagnosis/history
GET /api/mobile/ai-diagnosis/:id
DELETE /api/mobile/ai-diagnosis/:id
```

---

## Phase 5: E-commerce Features 🛒

### Priority: MEDIUM
### Estimated Time: 3-4 days

### Tasks:

#### 5.1 Product Detail Screen
- [ ] Fetch product by ID
- [ ] Image gallery with zoom
- [ ] Product name, brand, description
- [ ] Price display (original + discount)
- [ ] Stock status indicator
- [ ] Ratings and reviews section
- [ ] Usage instructions
- [ ] Related products
- [ ] Quantity selector
- [ ] "Tambah ke Keranjang" button
- [ ] "Beli Sekarang" button

#### 5.2 Cart Enhancement
- [ ] List cart items from Redux
- [ ] Product card with image
- [ ] Quantity adjustment (+/-)
- [ ] Remove item confirmation
- [ ] Apply coupon code
- [ ] Calculate shipping
- [ ] Total price summary
- [ ] "Checkout" button (requires full account)

#### 5.3 Checkout Screen
- [ ] Check authLevel (must be FULL_ACCOUNT)
- [ ] Delivery address selection
- [ ] Add new address modal
- [ ] Shipping method selector
- [ ] Payment method cards
- [ ] Order summary
- [ ] Terms checkbox
- [ ] "Bayar Sekarang" button
- [ ] POST /api/mobile/orders
- [ ] Payment gateway integration (Midtrans)
- [ ] Success screen
- [ ] Clear cart after success

#### 5.4 Order History
- [ ] Fetch orders from API
- [ ] List view with status badges
- [ ] Filter by status
- [ ] Tap for order details
- [ ] Track shipment
- [ ] Reorder button
- [ ] Leave review
- [ ] Download invoice

**API Endpoints:**
```
GET /api/mobile/products
GET /api/mobile/products/:id
GET /api/mobile/categories
POST /api/mobile/orders
GET /api/mobile/orders
GET /api/mobile/orders/:id
```

---

## Phase 6: Polish & UX Improvements ✨

### Priority: MEDIUM
### Estimated Time: 2-3 days

### Tasks:

#### 6.1 Animations
- [ ] Install react-native-reanimated
- [ ] Fade-in animations for cards
- [ ] Slide-in for modals
- [ ] Skeleton to content transition
- [ ] Tab switch animation
- [ ] Success/error animations (Lottie)

#### 6.2 Micro-interactions
- [ ] Button press feedback
- [ ] Haptic feedback (vibration)
- [ ] Ripple effects
- [ ] Smooth scroll
- [ ] Pull-to-refresh indicator
- [ ] Loading indicators

#### 6.3 Advanced Features
- [ ] Search with debounce
- [ ] Infinite scroll for lists
- [ ] Image caching
- [ ] Deep linking
- [ ] Share functionality
- [ ] QR code scanner (appointment check-in)

#### 6.4 Error Handling
- [ ] Network error retry
- [ ] Offline mode banner
- [ ] Form validation errors
- [ ] API error messages (Indonesian)
- [ ] Timeout handling
- [ ] 404 screens

---

## Phase 7: Testing & Optimization 🧪

### Priority: HIGH before production
### Estimated Time: 3-5 days

### Tasks:

#### 7.1 Testing
- [ ] Unit tests (Jest)
- [ ] Component tests (React Testing Library)
- [ ] E2E tests (Detox)
- [ ] Manual testing on iOS
- [ ] Manual testing on Android
- [ ] Test offline scenarios
- [ ] Test authentication flows
- [ ] Test payment flow (sandbox)

#### 7.2 Performance
- [ ] Bundle size optimization
- [ ] Image optimization
- [ ] Code splitting
- [ ] Lazy loading
- [ ] Memory leak checks
- [ ] FPS monitoring
- [ ] Network request optimization

#### 7.3 Accessibility
- [ ] Screen reader support
- [ ] Keyboard navigation
- [ ] Font scaling
- [ ] Color contrast checks
- [ ] Focus indicators
- [ ] Accessible labels

#### 7.4 Security
- [ ] Secure token storage
- [ ] Biometric authentication
- [ ] SSL pinning
- [ ] Data encryption
- [ ] Sensitive data masking
- [ ] Rate limiting

---

## Phase 8: Pre-launch Preparation 🚀

### Priority: HIGH
### Estimated Time: 1-2 weeks

### Tasks:

#### 8.1 App Store Preparation
- [ ] App icon (1024x1024)
- [ ] Splash screen
- [ ] Screenshots (all sizes)
- [ ] App description (ID/EN)
- [ ] Keywords
- [ ] Privacy policy URL
- [ ] Terms of service
- [ ] Support URL

#### 8.2 Build & Deploy
- [ ] Configure app signing (iOS)
- [ ] Configure keystore (Android)
- [ ] Build production IPA
- [ ] Build production APK/AAB
- [ ] TestFlight beta testing
- [ ] Google Play internal testing
- [ ] Bug fixes from beta

#### 8.3 Documentation
- [ ] User guide
- [ ] FAQ
- [ ] Troubleshooting
- [ ] Contact support
- [ ] Release notes

#### 8.4 Marketing
- [ ] Landing page
- [ ] Demo video
- [ ] Social media posts
- [ ] Press release
- [ ] Influencer outreach

---

## Maintenance & Future Features 🔮

### Ongoing
- [ ] Monitor crash reports (Sentry)
- [ ] Analytics (Mixpanel/Amplitude)
- [ ] User feedback collection
- [ ] A/B testing
- [ ] Feature flags

### Future Ideas
- [ ] Video consultation
- [ ] Teledentistry chat
- [ ] Dental records upload
- [ ] Family account management
- [ ] Loyalty program
- [ ] Referral system
- [ ] AI-powered chatbot
- [ ] 3D teeth visualization
- [ ] Virtual try-on (braces)
- [ ] Dental insurance integration

---

## Quick Reference: File Structure

```
Appointment Flow:
- AppointmentListScreen.jsx       ✅ Created (basic)
- ClinicSearchScreen.jsx           ✅ Created (functional)
- ClinicDetailScreen.jsx           📝 Placeholder
- DentistDetailScreen.jsx          📝 Placeholder
- BookingSlotScreen.jsx            📝 Placeholder
- BookingConfirmScreen.jsx         📝 Placeholder

Auth Flow:
- LoginScreen.jsx                  📝 Placeholder
- RegisterScreen.jsx               📝 Placeholder
- OTPScreen.jsx                    📝 Placeholder
- ProfileScreen.jsx                📝 Placeholder

AI Flow:
- AIHomeScreen.jsx                 ✅ Created (complete)
- CameraScreen.jsx                 ✅ Created (functional)
- ImagePreviewScreen.jsx           ✅ Created (functional)
- AnalysisScreen.jsx               ✅ Created (animated)
- ResultScreen.jsx                 ✅ Created (complete)
- HistoryScreen.jsx                ✅ Created (empty state)

Shop Flow:
- ShopHomeScreen.jsx               ✅ Created (functional)
- ProductDetailScreen.jsx          📝 Placeholder
- CartScreen.jsx                   ✅ Created (empty state)
- CheckoutScreen.jsx               📝 Placeholder

Settings:
- SettingsScreen.jsx               ✅ Created (complete)
```

---

## Development Tips

### Priority Order:
1. **Phase 2** (Appointment) - Core user journey
2. **Phase 3** (Auth) - Required for booking
3. **Phase 4** (AI) - Unique selling point
4. **Phase 5** (Shop) - Revenue generation
5. **Phase 6-8** - Polish and launch

### Recommended Daily Schedule:
- Morning: Build new features
- Afternoon: Test and fix bugs
- Evening: Code review and documentation

### Code Quality:
- Follow existing patterns in codebase
- Use TypeScript type checking (via JSDoc if needed)
- Keep components small (<300 lines)
- Extract reusable logic to hooks
- Write meaningful commit messages

---

**Last Updated:** November 12, 2025
**Current Phase:** Phase 1 Complete ✅
**Next Milestone:** Phase 2 - Appointment Booking (Start Here!)
