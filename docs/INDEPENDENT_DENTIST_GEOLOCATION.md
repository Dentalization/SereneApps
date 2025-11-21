# 📍 Geolocation for Independent Dentist Registration

## ✅ **Implementation Summary**

### **1. Database Updates** 🗄️

#### **Migration 025: Clinic Geolocation**
Added geolocation to clinic tables:

**`clinic_profiles` columns:**
- `latitude` (DECIMAL 10,8)
- `longitude` (DECIMAL 11,8)  
- `district` (TEXT)
- `province` (TEXT)
- `postal_code` (TEXT)

**`clinic_branches` columns:**
- Same geolocation fields as clinic_profiles

**Indexes:**
- Spatial indexes on lat/lng for fast GPS search
- City/district indexes for text-based search

---

### **2. Web Registration Form** 🌐

#### **Updated: `/web/src/pages/auth/Register.jsx`**

**New State Variables:**
```javascript
// Geolocation Information (for Independent Dentist)
const [city, setCity] = useState('');
const [district, setDistrict] = useState('');
const [province, setProvince] = useState('');
const [postalCode, setPostalCode] = useState('');
const [latitude, setLatitude] = useState('');
const [longitude, setLongitude] = useState('');
```

**Indonesian Cities Data (20 cities):**
```javascript
const indonesianCities = [
  { name: 'Jakarta Pusat', province: 'DKI Jakarta', lat: -6.1944, lng: 106.8229 },
  { name: 'Surabaya', province: 'Jawa Timur', lat: -7.2754, lng: 112.7378 },
  // ... 18 more cities
];
```

**New Form Section** (Step 3 - after Clinic Address):
```jsx
<h3>📍 Lokasi Praktik</h3>

// City (dropdown) - Auto-fills province & GPS
<select onChange={handleCityChange}>
  {indonesianCities.map(city => (
    <option>{city.name} - {city.province}</option>
  ))}
</select>

// District (text input)
<input placeholder="Menteng, Kebayoran Baru" />

// Province (read-only, auto-filled)
<input value={province} readOnly />

// Postal Code (optional)
<input maxLength={5} placeholder="12345" />

// Latitude & Longitude (read-only, auto-filled)
<input value={latitude} readOnly />
<input value={longitude} readOnly />
```

**Auto-Fill Logic:**
When user selects a city, the form automatically fills:
- ✅ Province
- ✅ Latitude  
- ✅ Longitude

User only needs to fill:
- ✅ City (dropdown selection)
- ✅ District (manual input)
- ✅ Postal Code (optional)

---

### **3. Backend API Updates** 🔌

#### **Updated: `/backend/src/routes/auth.js`**

**Request Body Extraction:**
```javascript
const { 
  // ... existing fields ...
  
  // Geolocation Information
  city, district, province, postalCode, latitude, longitude,
} = req.body || {};
```

**Database INSERT:**
```javascript
INSERT INTO dentist_profiles(
  // ... existing columns ...
  city, district, province, postal_code, 
  latitude, longitude, dentist_type,
  // ... document paths ...
) VALUES (
  // ... existing values ...
  city || null,
  district || null,
  province || null,
  postalCode || null,
  latitude ? parseFloat(latitude) : null,
  longitude ? parseFloat(longitude) : null,
  'independent', // Default type for web registration
  // ... documents ...
)
```

---

## 🎯 **How It Works**

### **For Independent Dentists (Web Registration):**

1. **User fills personal & professional info** (Steps 1-2)

2. **Step 3: Clinic Information**
   - Fills clinic name & address
   - **Selects city from dropdown** (20 Indonesian cities)
   - Province, Lat, Lng **auto-filled**
   - Enters district manually
   - Optional: postal code

3. **On Submit:**
   - Dentist profile created with `dentist_type = 'independent'`
   - GPS coordinates saved from city selection
   - Searchable via `/v1/dentists/nearby` API

4. **Nearby Search:**
   - Mobile app gets user GPS location
   - Backend calculates distance using Haversine
   - Returns sorted by distance (nearest first)

---

### **For Clinic Dentists (Future):**

1. **Clinic admin adds dentist to clinic**
   - Dentist created with `dentist_type = 'clinic'`
   - `clinic_id` references the clinic
   - GPS coordinates **inherited from clinic/branch**

2. **Geolocation Sync:**
   - When querying nearby dentists
   - Backend JOINs `dentist_profiles` with `clinics` or `clinic_branches`
   - Uses clinic's GPS coordinates for clinic dentists

3. **Example Query:**
```sql
SELECT 
  dp.*,
  COALESCE(
    cb.latitude, -- Use branch location if available
    cp.latitude, -- Fallback to clinic main location
    dp.latitude  -- Fallback to dentist's own location
  ) as final_latitude,
  COALESCE(
    cb.longitude,
    cp.longitude,
    dp.longitude
  ) as final_longitude
FROM dentist_profiles dp
LEFT JOIN clinics c ON dp.clinic_id = c.id
LEFT JOIN clinic_profiles cp ON c.id = cp.id
LEFT JOIN clinic_branches cb ON dp.branch_id = cb.id
```

---

## 📊 **Database State**

```
✅ dentist_profiles columns:
├── city (TEXT) - "Jakarta Pusat", "Surabaya"
├── district (TEXT) - "Menteng", "Kebayoran Baru"
├── province (TEXT) - "DKI Jakarta", "Jawa Timur"
├── postal_code (TEXT) - "12345"
├── latitude (DECIMAL) - -6.1944
├── longitude (DECIMAL) - 106.8229
└── dentist_type (TEXT) - 'independent' or 'clinic'

✅ clinic_profiles columns:
├── latitude (DECIMAL)
├── longitude (DECIMAL)
├── district (TEXT)
├── province (TEXT)
└── postal_code (TEXT)

✅ clinic_branches columns:
├── latitude (DECIMAL)
├── longitude (DECIMAL)
├── district (TEXT)
├── province (TEXT)
└── postal_code (TEXT)
```

---

## 🧪 **Testing**

### **1. Test Web Registration:**

1. Navigate to `/register` on web app
2. Fill Steps 1-2 (Personal & Professional)
3. Step 3:
   - Enter clinic name & address
   - Select "Jakarta Pusat - DKI Jakarta" from city dropdown
   - Enter district: "Menteng"
   - Verify province auto-fills: "DKI Jakarta"
   - Verify GPS auto-fills: lat=-6.1944, lng=106.8229
4. Complete registration
5. Check database:
```sql
SELECT name, city, district, province, latitude, longitude, dentist_type
FROM users u
JOIN dentist_profiles dp ON u.id = dp.user_id
ORDER BY u.created_at DESC LIMIT 1;
```

### **2. Test Nearby Search:**

```bash
# Search near Jakarta (should find newly registered dentist)
curl "http://localhost:4000/v1/dentists/nearby?latitude=-6.2&longitude=106.8&radius=10&type=independent"
```

Expected: Returns the dentist with distance calculated

---

## 🎨 **UX Features**

### **Smart Auto-Fill:**
- User selects city → Province, Lat, Lng auto-filled
- Reduces manual input errors
- Ensures accurate GPS coordinates

### **Visual Feedback:**
```
📍 Lokasi Praktik
ℹ️ Informasi ini digunakan untuk membantu pasien menemukan 
   praktik Anda berdasarkan lokasi terdekat

Kota * 
[Jakarta Pusat - DKI Jakarta ▼]

Kecamatan/Distrik *
[Menteng                    ]

Provinsi *
[DKI Jakarta               ] 🔒 (otomatis terisi)

Kode Pos
[12345                      ]

Latitude
[-6.1944                    ] 🔒 (otomatis terisi)

Longitude  
[106.8229                   ] 🔒 (otomatis terisi)
```

---

## 🔄 **Data Flow**

```
┌─────────────────┐
│  Web Form       │
│  (Register.jsx) │
└────────┬────────┘
         │ 1. User selects city
         │    "Jakarta Pusat"
         ▼
┌─────────────────┐
│  Auto-Fill      │
│  Logic          │
└────────┬────────┘
         │ 2. Set province, lat, lng
         │    from indonesianCities[]
         ▼
┌─────────────────┐
│  FormData       │
│  POST /register │
└────────┬────────┘
         │ 3. Include geolocation
         │    in request body
         ▼
┌─────────────────┐
│  Backend API    │
│  auth.js        │
└────────┬────────┘
         │ 4. INSERT dentist_profiles
         │    with city, district,
         │    province, lat, lng
         ▼
┌─────────────────┐
│  Database       │
│  PostgreSQL     │
└────────┬────────┘
         │ 5. dentist_type='independent'
         │    Searchable via GPS
         ▼
┌─────────────────┐
│  Nearby API     │
│  /dentists/     │
│  nearby         │
└─────────────────┘
```

---

## ✅ **Completed Tasks**

1. ✅ Added geolocation columns to `dentist_profiles`
2. ✅ Added geolocation columns to `clinic_profiles` & `clinic_branches`
3. ✅ Created Indonesian cities dataset (20 cities with GPS)
4. ✅ Updated web registration form with geolocation section
5. ✅ Implemented auto-fill logic for province & GPS
6. ✅ Updated backend to accept geolocation data
7. ✅ Set default `dentist_type = 'independent'` for web registration
8. ✅ Ready for `/v1/dentists/nearby` API integration

---

## 🚧 **Next Steps**

### **For Clinic Dentists:**
1. Admin panel to add dentists to clinics
2. Geolocation inheritance from clinic/branch
3. Update `/v1/dentists/nearby` to use clinic GPS for clinic dentists

### **For Enhanced UX:**
1. Google Maps integration for manual GPS selection
2. Address autocomplete
3. District suggestions based on selected city
4. Validate postal code format (5 digits)

---

**Built with ❤️ for SereneApps**  
*Connecting patients with nearby dentists*
