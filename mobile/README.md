# SereneAI Dental Patient Mobile App

A comprehensive React Native mobile application for dental health management using Expo, featuring AI-powered diagnosis, appointment booking, e-commerce, and patient management.

## 🚀 Features

### 5 Main Tabs

1. **Dashboard (Beranda)**
   - Welcome hero section with gradient
   - Quick action buttons (AI Scan, Book Appointment, Shop, History)
   - Dental health tips carousel
   - Upcoming appointment preview

2. **Appointment (Janji)**
   - Browse and search dental clinics
   - View dentist profiles and availability
   - Book appointments with date/time selection
   - Appointment history and management
   - OTP verification required for booking

3. **AI Diagnosis (First Diagnosis)**
   - Camera interface for dental photo capture
   - Multi-image support (3-5 photos)
   - Client-side validation (size, quality)
   - AI analysis with risk level assessment
   - Detailed results with affected teeth
   - Diagnosis history with offline support

4. **Shop (Belanja)**
   - Product catalog with categories
   - Product detail with ratings and reviews
   - Shopping cart management
   - Checkout flow (requires full account)
   - Order history

5. **Settings (Akun)**
   - Account management (Guest/OTP/Full account)
   - Profile editing
   - Theme switcher (Light/Dark mode)
   - Language selection (ID/EN)
   - Privacy controls and data management

## 🏗️ Architecture

### Tech Stack
- **Framework**: React Native with Expo SDK 51
- **Navigation**: React Navigation (Stack + Bottom Tabs)
- **UI Library**: React Native Paper (Material Design 3)
- **State Management**: Redux Toolkit with Redux Persist
- **Storage**: AsyncStorage for offline-first data
- **HTTP Client**: Axios with interceptors
- **Validation**: Zod for runtime validation
- **Image Picker**: expo-image-picker
- **Gradient**: expo-linear-gradient
- **Icons**: MaterialCommunityIcons

### Folder Structure
```
mobile/
├── App.js                      # Main app entry point
├── app.json                    # Expo configuration
├── package.json
├── babel.config.js
└── src/
    ├── features/               # Feature-first architecture
    │   ├── dashboard/
    │   │   └── screens/
    │   ├── appointment/
    │   │   └── screens/
    │   ├── ai-diagnosis/
    │   │   └── screens/
    │   ├── shop/
    │   │   └── screens/
    │   └── settings/
    │       └── screens/
    ├── navigation/             # Navigation configuration
    ├── store/                  # Redux store and slices
    │   └── slices/
    ├── services/               # API services
    ├── components/             # Shared components
    │   └── shared/
    ├── theme/                  # Theme configuration
    └── utils/                  # Utilities and helpers
```

## 🎨 Design System

### Color Palette
- **Primary**: Teal (#00BFA6) - Main brand color
- **Secondary**: Blue (#1976D2) - Supporting actions
- **Accent**: Pink (#FF6B9D) - Highlights
- **Success**: Green (#4CAF50) - Success states
- **Warning**: Orange (#FF9800) - Warnings
- **Error**: Red (#F44336) - Errors

### Theme Features
- ✅ Light and Dark mode support
- ✅ Material Design 3 (MD3) components
- ✅ Consistent spacing and typography
- ✅ Accessible color contrasts (WCAG 2.1 AA)
- ✅ Medical-grade risk indicators
- ✅ Semantic color system

## 🔐 Authentication Flow

### Three-tier Access System

1. **Guest Mode** (Default)
   - Browse clinics and doctors
   - Run AI self-check (stored locally)
   - Browse products
   - View educational content

2. **OTP Verified** (Phone verification)
   - Book appointments
   - Access basic features
   - Limited data sync

3. **Full Account** (Complete registration)
   - Payment and checkout
   - Cloud data sync
   - Full medical profile
   - Order history

### Route Guards
- Gentle prompts for sensitive actions
- Modal-based authentication requests
- Seamless flow between guest → OTP → full account

## 📱 Key Features

### Offline-First
- AI diagnosis results stored locally
- Cart persists across sessions
- Settings and preferences cached
- Graceful online/offline transitions

### Medical Safety
- Risk level indicators (Critical, High, Medium, Low, Healthy)
- Confidence scores for AI predictions
- Medical disclaimers
- Emergency contact information

### UX Best Practices
- Skeleton loading states
- Empty state illustrations
- Error handling with retry
- Toast notifications
- Pull-to-refresh
- Smooth animations
- 44×44 minimum touch targets

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI
- iOS Simulator or Android Emulator (optional)
- Expo Go app on your phone (for testing)

### Installation

1. Navigate to mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Start Expo development server:
```bash
npm start
```

4. Run on platform:
```bash
npm run ios      # iOS Simulator
npm run android  # Android Emulator
npm run web      # Web browser
```

Or scan the QR code with Expo Go app on your phone.

## 🔧 Configuration

### Backend API
Update the API base URL in `src/services/api.js`:
```javascript
const API_BASE_URL = 'http://localhost:4000/api';
```

For mobile device testing, replace `localhost` with your computer's IP address:
```javascript
const API_BASE_URL = 'http://192.168.1.XXX:4000/api';
```

## 📦 Redux Store

### Slices
- **authSlice**: User authentication and profile
- **cartSlice**: Shopping cart management
- **aiSlice**: AI diagnosis results and history
- **settingsSlice**: App preferences (theme, language)

### Persistence
All slices are persisted using AsyncStorage for offline support.

## 🎯 Success Criteria

✅ **Complete**
- [x] 5 tabs with proper icons and navigation
- [x] Light and dark theme support
- [x] Guest mode with feature exploration
- [x] Route guards for protected actions
- [x] Redux state management with persistence
- [x] Comprehensive theme system
- [x] Shared component library
- [x] API service layer
- [x] Validation with Zod
- [x] Offline-first AI results
- [x] Medical-grade UX with risk indicators
- [x] Empty and error states
- [x] Skeleton loaders

🚧 **To Complete** (Placeholder screens ready)
- [ ] Full appointment booking flow
- [ ] Product detail and checkout
- [ ] Login/Register forms
- [ ] OTP verification flow
- [ ] Profile management
- [ ] Backend API integration

## 📚 Documentation

- Design Guidelines: `docs/DESIGN_GUIDELINE.md`
- Database Schema: `docs/DATABASE_PATIENT_PROFILE.md`
- Mobile App Setup: `docs/MOBILE_APP_SETUP_PROMPT.md`

## 🤝 Contributing

This is a comprehensive dental health platform. Follow the feature-first architecture and maintain consistent design patterns.

## 📄 License

Copyright © 2025 SereneAI. All rights reserved.
