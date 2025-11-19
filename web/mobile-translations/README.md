# 🌍 Mobile Translation Package - SereneAI

> **Comprehensive Indonesian & English translations for SereneAI mobile app**

---

## 📦 **Package Contents**

- `en.json` - English translations (default)
- `id.json` - Indonesian translations (Bahasa Indonesia)

---

## 🚀 **Quick Start**

### **Flutter Implementation**

#### **1. Install Dependencies**

```yaml
# pubspec.yaml
dependencies:
  flutter_localizations:
    sdk: flutter
  intl: any
  easy_localization: ^3.0.3  # Or use flutter_i18n
```

#### **2. Add Translation Files**

```
your_app/
  assets/
    translations/
      en.json
      id.json
```

Update `pubspec.yaml`:
```yaml
flutter:
  assets:
    - assets/translations/
```

#### **3. Initialize in main.dart**

```dart
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await EasyLocalization.ensureInitialized();
  
  runApp(
    EasyLocalization(
      supportedLocales: [Locale('en'), Locale('id')],
      path: 'assets/translations',
      fallbackLocale: Locale('en'),
      child: MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      localizationsDelegates: context.localizationDelegates,
      supportedLocales: context.supportedLocales,
      locale: context.locale,
      home: HomePage(),
    );
  }
}
```

#### **4. Usage in Widgets**

```dart
import 'package:easy_localization/easy_localization.dart';

// Simple translation
Text('auth.login.title'.tr())  // Output: "Login" or "Masuk"

// With parameters
Text('home.greeting'.tr(namedArgs: {'name': 'John'}))
// Output: "Hello, John" or "Halo, John"

// Validation messages
Text('validation.minLength'.tr(namedArgs: {'min': '8'}))
// Output: "Must be at least 8 characters"

// Change language
EasyLocalization.of(context)?.setLocale(Locale('id'));
```

---

### **React Native Implementation**

#### **1. Install Dependencies**

```bash
npm install i18next react-i18next
# or
yarn add i18next react-i18next
```

#### **2. Create i18n Configuration**

```javascript
// i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './translations/en.json';
import id from './translations/id.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      id: { translation: id },
    },
    lng: 'id', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
```

#### **3. Initialize in App.js**

```javascript
import React from 'react';
import './i18n';
import { useTranslation } from 'react-i18next';

function App() {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}
```

#### **4. Usage in Components**

```javascript
import { useTranslation } from 'react-i18next';

function LoginScreen() {
  const { t, i18n } = useTranslation();
  
  return (
    <View>
      <Text>{t('auth.login.title')}</Text>
      <TextInput 
        placeholder={t('auth.login.emailPlaceholder')}
      />
      
      {/* With parameters */}
      <Text>{t('home.greeting', { name: 'John' })}</Text>
      
      {/* Change language */}
      <Button 
        title="Bahasa Indonesia"
        onPress={() => i18n.changeLanguage('id')}
      />
    </View>
  );
}
```

---

## 📚 **Translation Structure**

### **Key Naming Convention**

```
category.subcategory.key
```

**Examples:**
- `auth.login.title` - Authentication > Login > Title
- `appointments.bookNew.selectClinic` - Appointments > Book New > Select Clinic
- `common.loading` - Common > Loading

### **Available Categories**

| Category | Description | Keys |
|----------|-------------|------|
| `app` | App metadata | `name`, `tagline` |
| `common` | Common UI elements | `ok`, `cancel`, `save`, `loading`, etc. |
| `validation` | Form validation messages | `required`, `email`, `password`, etc. |
| `auth` | Authentication & registration | `login`, `register`, `otp`, `forgotPassword` |
| `home` | Home screen | `greeting`, `bookAppointment`, `upcomingTitle` |
| `appointments` | Appointment booking | `book`, `details`, `status`, `cancel` |
| `clinics` | Clinic search & details | `search`, `nearby`, `details`, `hours` |
| `dentists` | Dentist profiles | `specialization`, `experience`, `details` |
| `profile` | User profile | `personalInfo`, `medicalInfo`, `insurance` |
| `payments` | Payment processing | `pending`, `history`, `pay`, `status` |
| `chat` | In-app messaging | `typeMessage`, `send`, `online`, `typing` |
| `notifications` | Push notifications | `title`, `types`, `settings` |
| `records` | Dental records | `history`, `xrays`, `prescriptions` |
| `errors` | Error messages | `network`, `server`, `unauthorized` |
| `date` | Date & time | `today`, `tomorrow`, `days`, `months` |

---

## 🎯 **Common Use Cases**

### **1. Login Screen**

```dart
// Flutter
TextField(
  decoration: InputDecoration(
    labelText: 'auth.login.emailLabel'.tr(),
    hintText: 'auth.login.emailPlaceholder'.tr(),
  ),
)

ElevatedButton(
  onPressed: () {},
  child: Text('auth.login.loginButton'.tr()),
)
```

```javascript
// React Native
<TextInput 
  placeholder={t('auth.login.emailPlaceholder')}
/>
<Button title={t('auth.login.loginButton')} />
```

### **2. OTP Verification**

```dart
// Flutter
Text('auth.otp.subtitle'.tr(namedArgs: {'phone': '+628123456789'}))
// Output: "We've sent a 6-digit code to +628123456789"
```

```javascript
// React Native
<Text>{t('auth.otp.subtitle', { phone: '+628123456789' })}</Text>
```

### **3. Error Handling**

```dart
// Flutter
if (error.code == 1004) {
  showSnackBar('auth.otp.otpInvalid'.tr());
}
```

```javascript
// React Native
if (error.code === 1004) {
  Alert.alert(
    t('errors.common.title'),
    t('auth.otp.otpInvalid')
  );
}
```

### **4. Appointment Status**

```dart
// Flutter
String getStatusText(String status) {
  return 'appointments.status.$status'.tr();
}

// Usage
Text(getStatusText('confirmed'))  // Output: "Confirmed" or "Dikonfirmasi"
```

### **5. Date Formatting**

```dart
// Flutter
String getDayName(int weekday) {
  final days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  return 'date.days.${days[weekday - 1]}'.tr();
}
```

---

## 🔄 **Language Switching**

### **Flutter (easy_localization)**

```dart
// In Settings Screen
ListTile(
  title: Text('profile.settings.language'.tr()),
  subtitle: Text(context.locale.languageCode == 'id' 
    ? 'Bahasa Indonesia' 
    : 'English'),
  onTap: () {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => Column(
        children: [
          ListTile(
            title: Text('English'),
            onTap: () {
              context.setLocale(Locale('en'));
              Navigator.pop(ctx);
            },
          ),
          ListTile(
            title: Text('Bahasa Indonesia'),
            onTap: () {
              context.setLocale(Locale('id'));
              Navigator.pop(ctx);
            },
          ),
        ],
      ),
    );
  },
)
```

### **React Native (i18next)**

```javascript
function LanguageSettings() {
  const { i18n } = useTranslation();
  
  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    AsyncStorage.setItem('language', lang); // Persist selection
  };
  
  return (
    <View>
      <TouchableOpacity onPress={() => changeLanguage('en')}>
        <Text>English</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => changeLanguage('id')}>
        <Text>Bahasa Indonesia</Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

## 🎨 **Pluralization (Advanced)**

For features requiring plural forms (e.g., "1 appointment" vs "2 appointments"):

### **Add to translation files:**

```json
{
  "appointments": {
    "count": "{{count}} appointment",
    "count_plural": "{{count}} appointments"
  }
}
```

### **Usage:**

```dart
// Flutter
Text('appointments.count'.plural(5))  // "5 appointments"
```

```javascript
// React Native
<Text>{t('appointments.count', { count: 5 })}</Text>
```

---

## 📝 **Adding New Translations**

### **Step 1: Add to both `en.json` and `id.json`**

```json
// en.json
{
  "newFeature": {
    "title": "New Feature",
    "description": "This is a new feature"
  }
}

// id.json
{
  "newFeature": {
    "title": "Fitur Baru",
    "description": "Ini adalah fitur baru"
  }
}
```

### **Step 2: Use in code**

```dart
Text('newFeature.title'.tr())
```

---

## 🧪 **Testing Translations**

### **1. Check for missing keys**

```dart
// Add this to your dev tools
void checkMissingTranslations() {
  final enKeys = getKeysFromJson(enJson);
  final idKeys = getKeysFromJson(idJson);
  
  final missingInId = enKeys.difference(idKeys);
  final missingInEn = idKeys.difference(enKeys);
  
  print('Missing in ID: $missingInId');
  print('Missing in EN: $missingInEn');
}
```

### **2. Test language switching**

```dart
// Add dev menu option
void testAllLanguages() async {
  for (var locale in ['en', 'id']) {
    await context.setLocale(Locale(locale));
    await Future.delayed(Duration(seconds: 2));
    print('Tested: $locale');
  }
}
```

---

## 🌐 **API Response Localization**

Backend errors already support localization via `Accept-Language` header:

```dart
// Flutter (Dio interceptor)
class LanguageInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final currentLocale = EasyLocalization.of(context)?.locale.languageCode ?? 'id';
    options.headers['Accept-Language'] = currentLocale;
    super.onRequest(options, handler);
  }
}
```

```javascript
// React Native (Axios interceptor)
axios.interceptors.request.use((config) => {
  config.headers['Accept-Language'] = i18n.language;
  return config;
});
```

---

## 📊 **Translation Coverage**

| Category | Keys | Status |
|----------|------|--------|
| Common | 20 | ✅ Complete |
| Validation | 10 | ✅ Complete |
| Authentication | 45 | ✅ Complete |
| Appointments | 38 | ✅ Complete |
| Clinics | 18 | ✅ Complete |
| Dentists | 12 | ✅ Complete |
| Profile | 28 | ✅ Complete |
| Payments | 22 | ✅ Complete |
| Chat | 15 | ✅ Complete |
| Notifications | 13 | ✅ Complete |
| Records | 8 | ✅ Complete |
| Errors | 20 | ✅ Complete |
| Date/Time | 20 | ✅ Complete |

**Total: 269+ translation keys**

---

## 🔍 **Best Practices**

1. **Always use translation keys, never hardcode strings**
   ```dart
   ❌ Text('Login')
   ✅ Text('auth.login.title'.tr())
   ```

2. **Use meaningful key names**
   ```dart
   ❌ 'text1', 'button2'
   ✅ 'auth.login.emailLabel', 'common.save'
   ```

3. **Keep translations synchronized**
   - Update both `en.json` and `id.json` together
   - Use same key structure in both files

4. **Use parameters for dynamic content**
   ```dart
   ✅ 'home.greeting'.tr(namedArgs: {'name': userName})
   ```

5. **Test with both languages**
   - Indonesian text is often longer than English
   - Ensure UI doesn't break with longer text

---

## 📞 **Support**

**Translation Issues:**
- Missing keys? Add them to both files
- Unclear translations? Check context in API docs
- Need new category? Follow existing structure

**Technical Issues:**
- Flutter: Check `easy_localization` docs
- React Native: Check `react-i18next` docs

---

## 📅 **Version History**

- **v1.0.0** (Nov 10, 2025) - Initial release
  - 269+ translation keys
  - Complete authentication flow
  - Appointment booking
  - Profile management
  - Error messages
  - Date/time formatting

---

**Ready to use!** 🚀

Copy `en.json` and `id.json` to your mobile project and follow the implementation guide above.
