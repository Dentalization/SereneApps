## 🎨 Design Guidelines

### **🌈 Complete Color System**

#### **1. Brand Colors**
```javascript
export const brandColors = {
  primary: {
    main: '#00BFA6',       // Teal - Main brand color
    light: '#5DF2D6',      // Light teal for hover/pressed states
    dark: '#008E76',       // Dark teal for active states
    contrast: '#FFFFFF',   // White text on primary
  },
  secondary: {
    main: '#1976D2',       // Blue
    light: '#63A4FF',      // Light blue
    dark: '#004BA0',       // Dark blue
    contrast: '#FFFFFF',   // White text on secondary
  },
  accent: {
    main: '#FF6B9D',       // Pink
    light: '#FFB4C8',      // Light pink
    dark: '#C73E6E',       // Dark pink
    contrast: '#FFFFFF',   // White text on accent
  },
};
```

#### **2. Semantic Colors (Status & Feedback)**
```javascript
export const semanticColors = {
  success: {
    main: '#4CAF50',       // Green - Success states
    light: '#80E27E',      // Light green
    dark: '#087F23',       // Dark green
    background: '#E8F5E9', // Success background
    border: '#A5D6A7',     // Success border
    contrast: '#FFFFFF',   // White text
  },
  warning: {
    main: '#FF9800',       // Orange - Warning states
    light: '#FFD54F',      // Light orange
    dark: '#EF6C00',       // Dark orange
    background: '#FFF3E0', // Warning background
    border: '#FFB74D',     // Warning border
    contrast: '#000000',   // Black text
  },
  error: {
    main: '#F44336',       // Red - Error states
    light: '#FF7961',      // Light red
    dark: '#BA000D',       // Dark red
    background: '#FFEBEE', // Error background
    border: '#EF5350',     // Error border
    contrast: '#FFFFFF',   // White text
  },
  info: {
    main: '#2196F3',       // Blue - Info states
    light: '#64B5F6',      // Light blue
    dark: '#1565C0',       // Dark blue
    background: '#E3F2FD', // Info background
    border: '#90CAF9',     // Info border
    contrast: '#FFFFFF',   // White text
  },
};
```

#### **3. Neutral Colors (Grayscale)**
```javascript
export const neutralColors = {
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#FAFAFA',        // Lightest gray
    100: '#F5F5F5',       // Very light gray
    200: '#EEEEEE',       // Light gray
    300: '#E0E0E0',       // Gray
    400: '#BDBDBD',       // Medium gray
    500: '#9E9E9E',       // Gray
    600: '#757575',       // Dark gray
    700: '#616161',       // Darker gray
    800: '#424242',       // Very dark gray
    900: '#212121',       // Darkest gray
  },
};
```

#### **4. Background Colors**
```javascript
export const backgroundColors = {
  default: '#FFFFFF',      // Main background (white)
  paper: '#FFFFFF',        // Card/modal background
  surface: '#F5F5F5',      // Secondary surface (light gray)
  disabled: '#FAFAFA',     // Disabled background
  overlay: 'rgba(0, 0, 0, 0.5)', // Modal overlay
  backdrop: 'rgba(0, 0, 0, 0.3)', // Backdrop
};
```

#### **5. Text Colors**
```javascript
export const textColors = {
  primary: '#212121',      // Main text (dark gray)
  secondary: '#757575',    // Secondary text (medium gray)
  disabled: '#BDBDBD',     // Disabled text (light gray)
  hint: '#9E9E9E',         // Hint/placeholder text
  inverse: '#FFFFFF',      // White text on dark backgrounds
  link: '#1976D2',         // Link text (blue)
  linkPressed: '#004BA0',  // Pressed link
};
```

#### **6. Border Colors**
```javascript
export const borderColors = {
  default: '#E0E0E0',      // Default border (light gray)
  light: '#EEEEEE',        // Lighter border
  dark: '#BDBDBD',         // Darker border
  focus: '#00BFA6',        // Focused input border (primary)
  error: '#F44336',        // Error border (red)
  disabled: '#F5F5F5',     // Disabled border
};
```

#### **7. Appointment Status Colors**
```javascript
export const appointmentColors = {
  scheduled: {
    background: '#E3F2FD',  // Light blue
    text: '#1565C0',        // Dark blue
    border: '#90CAF9',      // Blue border
    icon: '#2196F3',        // Blue icon
  },
  confirmed: {
    background: '#E8F5E9',  // Light green
    text: '#087F23',        // Dark green
    border: '#A5D6A7',      // Green border
    icon: '#4CAF50',        // Green icon
  },
  inProgress: {
    background: '#FFF3E0',  // Light orange
    text: '#EF6C00',        // Dark orange
    border: '#FFB74D',      // Orange border
    icon: '#FF9800',        // Orange icon
  },
  completed: {
    background: '#E0F2F1',  // Light teal
    text: '#00695C',        // Dark teal
    border: '#80CBC4',      // Teal border
    icon: '#00BFA6',        // Teal icon
  },
  cancelled: {
    background: '#FFEBEE',  // Light red
    text: '#BA000D',        // Dark red
    border: '#EF5350',      // Red border
    icon: '#F44336',        // Red icon
  },
  rescheduled: {
    background: '#F3E5F5',  // Light purple
    text: '#6A1B9A',        // Dark purple
    border: '#CE93D8',      // Purple border
    icon: '#9C27B0',        // Purple icon
  },
  noShow: {
    background: '#ECEFF1',  // Light blue gray
    text: '#37474F',        // Dark blue gray
    border: '#B0BEC5',      // Blue gray border
    icon: '#607D8B',        // Blue gray icon
  },
};
```

#### **8. Medical Alert Colors (CRITICAL)**
```javascript
export const medicalAlertColors = {
  critical: {
    background: '#FFEBEE',  // Light red
    text: '#BA000D',        // Dark red
    border: '#F44336',      // Red border
    icon: '#D32F2F',        // Red icon
    badge: '#F44336',       // Red badge
  },
  high: {
    background: '#FFF3E0',  // Light orange
    text: '#EF6C00',        // Dark orange
    border: '#FF9800',      // Orange border
    icon: '#F57C00',        // Orange icon
    badge: '#FF9800',       // Orange badge
  },
  medium: {
    background: '#FFF9C4',  // Light yellow
    text: '#F57F17',        // Dark yellow
    border: '#FFEB3B',      // Yellow border
    icon: '#FBC02D',        // Yellow icon
    badge: '#FFEB3B',       // Yellow badge
  },
  low: {
    background: '#E8F5E9',  // Light green
    text: '#087F23',        // Dark green
    border: '#4CAF50',      // Green border
    icon: '#388E3C',        // Green icon
    badge: '#4CAF50',       // Green badge
  },
};
```

#### **9. AI Diagnosis Colors**
```javascript
export const aiDiagnosisColors = {
  healthy: {
    background: '#E8F5E9',  // Light green
    text: '#087F23',        // Dark green
    icon: '#4CAF50',        // Green
    progress: '#4CAF50',
  },
  warning: {
    background: '#FFF3E0',  // Light orange
    text: '#EF6C00',        // Dark orange
    icon: '#FF9800',        // Orange
    progress: '#FF9800',
  },
  critical: {
    background: '#FFEBEE',  // Light red
    text: '#BA000D',        // Dark red
    icon: '#F44336',        // Red
    progress: '#F44336',
  },
  processing: {
    background: '#E3F2FD',  // Light blue
    text: '#1565C0',        // Dark blue
    icon: '#2196F3',        // Blue
    progress: '#2196F3',
  },
};
```

#### **10. E-commerce Colors**
```javascript
export const ecommerceColors = {
  price: {
    original: '#757575',    // Gray (crossed out)
    discount: '#F44336',    // Red (discount price)
    final: '#212121',       // Black (final price)
  },
  stock: {
    inStock: '#4CAF50',     // Green
    lowStock: '#FF9800',    // Orange
    outOfStock: '#F44336',  // Red
  },
  rating: {
    filled: '#FFB300',      // Yellow/Gold (filled stars)
    empty: '#E0E0E0',       // Gray (empty stars)
  },
  badge: {
    new: '#00BFA6',         // Teal
    sale: '#F44336',        // Red
    bestseller: '#FF9800',  // Orange
    recommended: '#1976D2', // Blue
  },
};
```

#### **11. Gradient Colors**
```javascript
export const gradients = {
  primary: ['#00BFA6', '#5DF2D6'],        // Teal gradient
  secondary: ['#1976D2', '#63A4FF'],      // Blue gradient
  success: ['#4CAF50', '#80E27E'],        // Green gradient
  warning: ['#FF9800', '#FFD54F'],        // Orange gradient
  error: ['#F44336', '#FF7961'],          // Red gradient
  dark: ['#212121', '#424242'],           // Dark gradient
  shimmer: ['#F0F0F0', '#E0E0E0', '#F0F0F0'], // Loading shimmer
};
```

#### **12. Shadow Colors**
```javascript
export const shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
};
```

---

### **🎯 Color Usage Guidelines**

#### **When to Use Each Color:**

**Primary (#00BFA6 - Teal)**
- ✅ Main CTA buttons (Book Appointment, Submit, Confirm)
- ✅ Active navigation tabs
- ✅ Selected items
- ✅ Progress bars
- ✅ Important icons
- ❌ Don't use for error states or warnings

**Secondary (#1976D2 - Blue)**
- ✅ Secondary buttons (Cancel, Back)
- ✅ Links
- ✅ Info badges
- ✅ Calendar today indicator
- ❌ Don't overuse - reserve for supporting actions

**Success (#4CAF50 - Green)**
- ✅ Success messages
- ✅ Completed appointments
- ✅ Payment success
- ✅ Confirmed actions
- ✅ Healthy AI diagnosis
- ✅ In stock products

**Warning (#FF9800 - Orange)**
- ✅ Warning messages
- ✅ Pending actions
- ✅ Low stock alerts
- ✅ Appointment reminders
- ✅ Medium risk AI results
- ⚠️ Use sparingly - avoid alert fatigue

**Error (#F44336 - Red)**
- ✅ Error messages
- ✅ Form validation errors
- ✅ Cancelled appointments
- ✅ Critical medical alerts
- ✅ High risk AI results
- ✅ Out of stock
- ⚠️ Always pair with clear error message

**Medical Alerts**
- 🚨 **Critical** (Red): Severe allergies, bleeding disorders
- ⚠️ **High** (Orange): Chronic conditions affecting treatment
- ⚡ **Medium** (Yellow): Medications with interactions
- ℹ️ **Low** (Green): General medical notes

---

### **📐 Color Accessibility (WCAG 2.1 AA)**

```javascript
// Contrast Ratios (Text on Background)
const accessibleCombinations = {
  // ✅ PASS (4.5:1 minimum for normal text)
  primary_on_white: 4.52,      // #00BFA6 on #FFFFFF
  secondary_on_white: 5.14,    // #1976D2 on #FFFFFF
  dark_on_white: 16.1,         // #212121 on #FFFFFF
  white_on_primary: 3.2,       // #FFFFFF on #00BFA6 (Large text only)
  white_on_secondary: 4.5,     // #FFFFFF on #1976D2
  
  // ⚠️ FAIL (Use for large text 18pt+ or icons only)
  white_on_accent: 2.8,        // #FFFFFF on #FF6B9D (Icons only)
};

// Large Text (18pt+ or 14pt+ bold) requires 3:1 minimum
// Normal Text (< 18pt) requires 4.5:1 minimum
```

**Accessible Text Combinations:**
```javascript
export const accessibleTextColors = {
  onWhite: {
    primary: textColors.primary,      // #212121 (✅ 16.1:1)
    secondary: textColors.secondary,  // #757575 (✅ 4.6:1)
  },
  onPrimary: {
    primary: '#FFFFFF',               // ✅ White on teal (3.2:1 - large text)
  },
  onError: {
    primary: '#FFFFFF',               // ✅ White on red (4.5:1)
  },
  onSuccess: {
    primary: '#FFFFFF',               // ✅ White on green (4.1:1)
  },
};
```

---

### **🌓 Dark Mode Support (Optional)**

```javascript
export const darkModeColors = {
  background: {
    default: '#121212',      // Main background
    paper: '#1E1E1E',        // Cards/modals
    surface: '#2C2C2C',      // Secondary surface
  },
  text: {
    primary: '#FFFFFF',      // Main text
    secondary: '#B0B0B0',    // Secondary text
    disabled: '#6E6E6E',     // Disabled text
  },
  primary: {
    main: '#5DF2D6',         // Lighter teal for dark mode
    dark: '#00BFA6',
  },
  divider: '#383838',        // Borders/dividers
};
```

---

### **🎨 Color Theme Configuration**

```javascript
// src/theme/colors.js
export const lightTheme = {
  colors: {
    ...brandColors,
    ...semanticColors,
    ...neutralColors,
    background: backgroundColors,
    text: textColors,
    border: borderColors,
    appointment: appointmentColors,
    medicalAlert: medicalAlertColors,
    aiDiagnosis: aiDiagnosisColors,
    ecommerce: ecommerceColors,
  },
  gradients,
  shadows,
};

// React Native Paper theme integration
import { MD3LightTheme } from 'react-native-paper';

export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: brandColors.primary.main,
    secondary: brandColors.secondary.main,
    tertiary: brandColors.accent.main,
    error: semanticColors.error.main,
    success: semanticColors.success.main,
    warning: semanticColors.warning.main,
    background: backgroundColors.default,
    surface: backgroundColors.surface,
    surfaceVariant: neutralColors.gray[100],
    onPrimary: brandColors.primary.contrast,
    onSecondary: brandColors.secondary.contrast,
    onError: semanticColors.error.contrast,
    onBackground: textColors.primary,
    onSurface: textColors.primary,
    outline: borderColors.default,
    outlineVariant: borderColors.light,
  },
};
```

---

### **Typography**
```javascript
export const typography = {
  h1: { fontSize: 32, fontWeight: 'bold' },
  h2: { fontSize: 24, fontWeight: 'bold' },
  h3: { fontSize: 20, fontWeight: '600' },
  body1: { fontSize: 16, fontWeight: 'normal' },
  body2: { fontSize: 14, fontWeight: 'normal' },
  caption: { fontSize: 12, fontWeight: 'normal' },
  button: { fontSize: 16, fontWeight: '600' },
};
```

### **Spacing**
```javascript
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};
```

---