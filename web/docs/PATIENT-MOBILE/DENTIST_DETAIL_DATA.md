# 👨‍⚕️ Dentist Detail Screen - Data Specifications

## 📱 Overview

Dokumen ini berisi **semua data yang tersedia** untuk ditampilkan di Dentist Detail Screen pada mobile app SereneAI, lengkap dengan API endpoint, data structure, dan UI recommendations.

---

## 📊 Table of Contents

1. [API Endpoint](#api-endpoint)
2. [Complete Data Structure](#complete-data-structure)
3. [Data Categories](#data-categories)
4. [UI Layout Recommendations](#ui-layout-recommendations)
5. [Additional Endpoints](#additional-endpoints)
6. [Sample Response](#sample-response)

---

## 🔌 API Endpoint

### **Get Dentist by ID**

```http
GET /api/dentists/:id
```

**Parameters:**
- `id` (path) - Dentist profile ID

**Response Format:**
```json
{
  "success": true,
  "data": {
    // Dentist profile data
    // Clinic associations
  }
}
```

**Status Codes:**
- `200` - Success
- `404` - Dentist not found
- `500` - Server error

---

## 📦 Complete Data Structure

### **1. Basic Information**

| Field | Type | Description | Example | UI Display |
|-------|------|-------------|---------|------------|
| `id` | BigInt | Dentist profile ID | `123` | Hidden (for API calls) |
| `user_id` | BigInt | User account ID | `456` | Hidden |
| `name` | String | Full name | `"Dr. Sarah Johnson"` | **Header Title** |
| `title` | String | Professional title | `"drg."` or `"drg. Sp.KG"` | Prefix before name |
| `avatar_url` | String | Profile photo URL | `"https://..."` | **Profile Picture** |
| `email` | String | Contact email | `"sarah@example.com"` | Contact section |
| `phone_number` | String | Contact phone | `"+628123456789"` | **Call Button** |

---

### **2. Professional Credentials**

| Field | Type | Description | Example | UI Display |
|-------|------|-------------|---------|------------|
| `license_number` | String | STR (Surat Tanda Registrasi) | `"STR-12345678"` | Credentials badge |
| `license_issuing_body` | String | Issuing authority | `"MKDKI"` | Credentials detail |
| `license_expiry_date` | Date | License expiration | `"2026-12-31"` | Validity indicator |
| `registration_number` | String | Registration number | `"REG-98765432"` | Credentials detail |
| `is_verified` | Boolean | Verification status | `true` | ✅ **Verified Badge** |
| `verification_date` | DateTime | Verification date | `"2024-01-15T10:00:00Z"` | Verified since date |

---

### **3. Specialization & Expertise**

| Field | Type | Description | Example | UI Display |
|-------|------|-------------|---------|------------|
| `specialization` | String | Primary specialization | `"Orthodontics"` | **Specialty Chip/Badge** |
| `education` | String | Education qualification | `"S1 Kedokteran Gigi, Universitas Indonesia"` | Education section |
| `years_of_experience` | Integer | Years of practice | `8` | **Experience Badge** "8 years exp" |

**Common Specializations:**
```javascript
const specializations = [
  "General Dentistry",          // Dokter Gigi Umum
  "Orthodontics",               // Ortodonti (Kawat Gigi)
  "Pediatric Dentistry",        // Kedokteran Gigi Anak
  "Periodontics",               // Periodontologi (Gusi)
  "Endodontics",                // Endodonti (Saluran Akar)
  "Prosthodontics",             // Prostodonti (Gigi Tiruan)
  "Oral Surgery",               // Bedah Mulut
  "Cosmetic Dentistry",         // Estetika Gigi
  "Implantology"                // Implant Gigi
];
```

---

### **4. Services & Consultation**

| Field | Type | Description | Example | UI Display |
|-------|------|-------------|---------|------------|
| `consultation_types` | String[] | Available consultation types | `["in-person", "teleconsult", "emergency"]` | **Service Type Chips** |
| `services_offered` | String[] | Treatment services | `["Cleaning", "Filling", "Root Canal"]` | **Services List** |
| `consultation_fee` | Integer | Base consultation fee (IDR) | `150000` | **Price Display** "Rp 150.000" |
| `accepts_insurance` | Boolean | Insurance acceptance | `true` | 💳 Insurance badge |
| `accepts_bpjs` | Boolean | BPJS acceptance | `true` | 🏥 BPJS badge |
| `emergency_availability` | Boolean | Emergency services | `true` | 🚨 **Emergency Badge** |

**Consultation Types:**
```javascript
const consultationTypes = {
  "in-person": {
    icon: "hospital",
    label: "In-Person",
    labelId: "Datang Langsung",
    color: "#00BFA6"
  },
  "teleconsult": {
    icon: "video",
    label: "Teleconsult",
    labelId: "Konsultasi Online",
    color: "#1976D2"
  },
  "emergency": {
    icon: "alert-circle",
    label: "Emergency",
    labelId: "Darurat 24/7",
    color: "#F44336"
  },
  "home-visit": {
    icon: "home",
    label: "Home Visit",
    labelId: "Kunjungan Rumah",
    color: "#FF9800"
  }
};
```

**Common Services Offered:**
```javascript
const services = [
  "Teeth Cleaning (Scaling)",          // Pembersihan Karang Gigi
  "Teeth Whitening",                    // Pemutihan Gigi
  "Dental Filling",                     // Tambal Gigi
  "Root Canal Treatment",               // Perawatan Saluran Akar
  "Tooth Extraction",                   // Cabut Gigi
  "Braces (Orthodontics)",              // Kawat Gigi
  "Dental Implants",                    // Implan Gigi
  "Dentures",                           // Gigi Palsu
  "Veneers",                            // Veneer Gigi
  "Crown & Bridge",                     // Mahkota & Jembatan
  "Pediatric Dentistry",                // Perawatan Gigi Anak
  "Gum Treatment",                      // Perawatan Gusi
  "Wisdom Tooth Extraction",            // Cabut Gigi Bungsu
  "Dental X-Ray",                       // Rontgen Gigi
  "Emergency Dental Care"               // Perawatan Darurat
];
```

---

### **5. Clinic Information**

| Field | Type | Description | Example | UI Display |
|-------|------|-------------|---------|------------|
| `clinic_name` | String | Primary clinic name | `"Klinik Gigi Sehat"` | Clinic name display |
| `clinic_address` | String | Clinic address | `"Jl. Sudirman No. 123, Jakarta"` | 📍 **Address with Map** |
| `clinic_working_hours` | String | Working hours | `"Mon-Fri: 09:00-17:00"` | 🕐 Operating hours |

### **6. Clinic Associations (Array)**

Dentist dapat bekerja di **multiple clinics**. Data ini dalam array `clinics[]`:

| Field | Type | Description | Example | UI Display |
|-------|------|-------------|---------|------------|
| `clinics[].id` | BigInt | Clinic profile ID | `789` | For booking selection |
| `clinics[].name` | String | Clinic brand name | `"Klinik Gigi Prima"` | **Clinic Card Title** |
| `clinics[].address` | String | Full address | `"Jl. Thamrin No. 45, Jakarta Pusat"` | 📍 Location |
| `clinics[].city` | String | City | `"Jakarta"` | Location badge |
| `clinics[].phone_number` | String | Clinic phone | `"021-1234567"` | ☎️ **Call Clinic Button** |
| `clinics[].role` | String | Dentist role at clinic | `"dentist"` | Role badge (if applicable) |
| `clinics[].is_active` | Boolean | Active status | `true` | Shows only if active |

**Example Clinics Array:**
```json
{
  "clinics": [
    {
      "id": 1,
      "name": "Klinik Gigi Sehat",
      "address": "Jl. Sudirman No. 123, Jakarta Selatan",
      "city": "Jakarta",
      "phone_number": "021-5678910",
      "role": "dentist",
      "is_active": true
    },
    {
      "id": 2,
      "name": "Dental Care Center",
      "address": "Jl. Gatot Subroto No. 45, Jakarta Pusat",
      "city": "Jakarta",
      "phone_number": "021-9876543",
      "role": "dentist",
      "is_active": true
    }
  ]
}
```

---

### **7. Timestamps**

| Field | Type | Description | Example | UI Display |
|-------|------|-------------|---------|------------|
| `created_at` | DateTime | Account creation | `"2023-01-15T10:00:00Z"` | "Member since Jan 2023" |
| `updated_at` | DateTime | Last profile update | `"2024-11-10T14:30:00Z"` | Hidden (internal use) |

---

## 🎨 Data Categories for UI

### **Category 1: Header Section**
- ✅ Avatar (`avatar_url`)
- ✅ Name with Title (`title` + `name`)
- ✅ Specialization Badge (`specialization`)
- ✅ Verified Badge (`is_verified`)
- ✅ Experience Badge (`years_of_experience`)
- ✅ Rating & Reviews (Future feature - not yet in DB)

### **Category 2: Quick Actions**
- 📞 Call Button (`phone_number`)
- 💬 Message Button (Chat feature)
- 📅 Book Appointment Button
- ⭐ Add to Favorites (Future feature)

### **Category 3: Professional Info**
- 🎓 Education (`education`)
- 🏥 Specialization (`specialization`)
- 📋 **STR Number** (`license_number`) - **WAJIB DITAMPILKAN**
- 🏛️ STR Issuing Body (`license_issuing_body`)
- 📅 STR Expiry Date (`license_expiry_date`)
- 📝 Registration Number (`registration_number`)
- ✅ Verified Status (`is_verified`, `verification_date`)
- 📅 Experience (`years_of_experience` years)

### **Category 4: Services**
- 💊 Services Offered (`services_offered[]`)
- 💰 Consultation Fee (`consultation_fee`)
- 🏥 Consultation Types (`consultation_types[]`)
- 💳 Insurance (`accepts_insurance`)
- 🏥 BPJS (`accepts_bpjs`)
- 🚨 Emergency (`emergency_availability`)

### **Category 5: Location & Availability**
- 📍 Clinic(s) where they work (`clinics[]`)
- 🏥 Primary Clinic (`clinic_name`)
- 📍 Address (`clinic_address`)
- 🕐 Working Hours (`clinic_working_hours`)
- 🗺️ Map View (Google Maps integration)

### **Category 6: Schedule & Booking**
- 📅 Available Days (from separate API)
- ⏰ Available Time Slots (from separate API)
- 📊 Next Available Appointment (computed)

### **Category 7: About**
- 👨‍⚕️ Professional Summary (Future: `about` field)
- 🎓 Education Details (`education`)
- 🏆 Certifications (Future feature)
- 📝 Languages Spoken (Future feature)

---

## 📱 UI Layout Recommendations

### **Screen 1: Dentist Detail Overview**

```jsx
<DentistDetailScreen>
  {/* HEADER SECTION */}
  <Header>
    <BackButton />
    <FavoriteButton />
    <ShareButton />
  </Header>

  {/* HERO SECTION */}
  <HeroSection>
    <AvatarLarge source={{ uri: dentist.avatar_url }} size={120} />
    <DentistName>
      {dentist.title} {dentist.name}
    </DentistName>
    <SpecializationChip>{dentist.specialization}</SpecializationChip>
    
    <BadgeRow>
      {dentist.is_verified && <VerifiedBadge>✅ Verified</VerifiedBadge>}
      <ExperienceBadge>🎓 {dentist.years_of_experience} years</ExperienceBadge>
      {dentist.emergency_availability && <EmergencyBadge>🚨 24/7</EmergencyBadge>}
    </BadgeRow>

    {/* Rating & Reviews - Future Feature */}
    <RatingSection>
      <StarRating rating={4.8} />
      <ReviewCount>(124 reviews)</ReviewCount>
    </RatingSection>
  </HeroSection>

  {/* QUICK ACTIONS */}
  <QuickActions>
    <ActionButton icon="phone" onPress={callDentist}>
      Call
    </ActionButton>
    <ActionButton icon="message" onPress={openChat}>
      Message
    </ActionButton>
    <ActionButton icon="calendar" onPress={bookAppointment} primary>
      Book Now
    </ActionButton>
  </QuickActions>

  {/* CONSULTATION FEE */}
  <ConsultationFeeCard>
    <FeeLabel>Consultation Fee</FeeLabel>
    <FeeAmount>Rp {formatNumber(dentist.consultation_fee)}</FeeAmount>
    <FeeNote>Starting from</FeeNote>
  </ConsultationFeeCard>

  {/* SERVICES OFFERED */}
  <Section>
    <SectionTitle>Services Offered</SectionTitle>
    <ServicesList>
      {dentist.services_offered.map(service => (
        <ServiceChip key={service}>
          <Icon name="check-circle" color="#00BFA6" />
          {service}
        </ServiceChip>
      ))}
    </ServicesList>
  </Section>

  {/* CONSULTATION TYPES */}
  <Section>
    <SectionTitle>Available Consultation Types</SectionTitle>
    <ConsultationTypeCards>
      {dentist.consultation_types.map(type => (
        <ConsultationCard key={type}>
          <Icon name={getTypeIcon(type)} size={32} />
          <TypeLabel>{getTypeLabel(type)}</TypeLabel>
        </ConsultationCard>
      ))}
    </ConsultationTypeCards>
  </Section>

  {/* INSURANCE & PAYMENT */}
  <Section>
    <SectionTitle>Payment Options</SectionTitle>
    <PaymentOptions>
      {dentist.accepts_insurance && (
        <PaymentBadge>
          <Icon name="credit-card" /> Insurance Accepted
        </PaymentBadge>
      )}
      {dentist.accepts_bpjs && (
        <PaymentBadge>
          <Icon name="medical-bag" /> BPJS Kesehatan
        </PaymentBadge>
      )}
    </PaymentOptions>
  </Section>

  {/* EDUCATION & CREDENTIALS */}
  <Section>
    <SectionTitle>Education & Credentials</SectionTitle>
    <CredentialCard>
      <CredentialItem>
        <Label>Education</Label>
        <Value>{dentist.education}</Value>
      </CredentialItem>
      
      {/* STR - WAJIB DITAMPILKAN */}
      <CredentialItem highlighted>
        <Label>STR Number (License)</Label>
        <Value fontWeight="bold">{dentist.license_number}</Value>
        <SubValue>
          Issued by: {dentist.license_issuing_body}
        </SubValue>
        <SubValue>
          Valid until: {formatDate(dentist.license_expiry_date)}
        </SubValue>
      </CredentialItem>
      
      <CredentialItem>
        <Label>Registration Number</Label>
        <Value>{dentist.registration_number}</Value>
      </CredentialItem>
      
      {dentist.is_verified && (
        <VerifiedStamp>
          ✅ Verified by SereneAI on{' '}
          {formatDate(dentist.verification_date)}
        </VerifiedStamp>
      )}
    </CredentialCard>
  </Section>

  {/* CLINIC LOCATIONS */}
  <Section>
    <SectionTitle>Practice Locations</SectionTitle>
    {dentist.clinics.map(clinic => (
      <ClinicCard key={clinic.id}>
        <ClinicHeader>
          <ClinicName>{clinic.name}</ClinicName>
          {clinic.is_active && <ActiveBadge>Active</ActiveBadge>}
        </ClinicHeader>
        <ClinicAddress>
          <Icon name="map-marker" color="#00BFA6" />
          {clinic.address}
        </ClinicAddress>
        <ClinicActions>
          <Button 
            variant="outline" 
            size="small"
            onPress={() => callClinic(clinic.phone_number)}
          >
            <Icon name="phone" /> Call Clinic
          </Button>
          <Button 
            variant="outline" 
            size="small"
            onPress={() => openMap(clinic.address)}
          >
            <Icon name="map" /> Get Directions
          </Button>
          <Button 
            variant="primary" 
            size="small"
            onPress={() => bookAtClinic(clinic.id)}
          >
            <Icon name="calendar" /> Book Here
          </Button>
        </ClinicActions>
      </ClinicCard>
    ))}
  </Section>

  {/* WORKING HOURS */}
  <Section>
    <SectionTitle>Working Hours</SectionTitle>
    <WorkingHoursCard>
      <Icon name="clock" size={24} color="#1976D2" />
      <HoursText>{dentist.clinic_working_hours}</HoursText>
    </WorkingHoursCard>
  </Section>

  {/* MEMBER SINCE */}
  <Section>
    <MemberSince>
      Member since {formatDate(dentist.created_at, 'MMMM yyyy')}
    </MemberSince>
  </Section>

  {/* FLOATING BOOK BUTTON */}
  <FloatingActionButton onPress={bookAppointment}>
    <Icon name="calendar" color="#FFFFFF" size={24} />
    Book Appointment
  </FloatingActionButton>
</DentistDetailScreen>
```

---

## 🔗 Additional Endpoints

### **1. Get Dentist Schedule**

```http
GET /api/dentists/:id/schedule?date=2024-11-15&clinicId=123
```

**Returns:**
- Operating hours for specific date
- Booked time slots
- Available/unavailable status

### **2. Get Available Time Slots**

```http
GET /api/dentists/:id/available-slots?date=2024-11-15&clinicId=123&duration=30
```

**Returns:**
- List of available time slots
- Booking duration
- Real-time availability

**Use in UI:**
- Time slot picker in booking flow
- Availability calendar
- "Next available" badge

---

## 📊 Sample Response

### **Complete Dentist Detail Response**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 5,
    "name": "Dr. Sarah Johnson",
    "email": "sarah.johnson@example.com",
    "phone_number": "+628123456789",
    "avatar_url": "https://sereneai.storage/avatars/sarah-johnson.jpg",
    "title": "drg. Sp.KG",
    "license_number": "STR-12345678",
    "license_issuing_body": "MKDKI (Majelis Kehormatan Disiplin Kedokteran Indonesia)",
    "license_expiry_date": "2026-12-31",
    "registration_number": "REG-98765432",
    "specialization": "Orthodontics",
    "education": "S1 Kedokteran Gigi - Universitas Indonesia, S2 Ortodonsia - Universitas Gadjah Mada",
    "years_of_experience": 8,
    "clinic_name": "Klinik Gigi Sehat Prima",
    "clinic_address": "Jl. Sudirman No. 123, Jakarta Selatan, DKI Jakarta 12190",
    "clinic_working_hours": "Mon-Fri: 09:00-17:00, Sat: 09:00-14:00",
    "consultation_types": [
      "in-person",
      "teleconsult",
      "emergency"
    ],
    "services_offered": [
      "Braces (Metal & Ceramic)",
      "Invisalign",
      "Retainers",
      "Teeth Alignment",
      "Dental X-Ray",
      "Orthodontic Consultation"
    ],
    "consultation_fee": 150000,
    "accepts_insurance": true,
    "accepts_bpjs": true,
    "emergency_availability": true,
    "is_verified": true,
    "verification_date": "2024-01-15T10:00:00Z",
    "created_at": "2023-06-10T08:30:00Z",
    "updated_at": "2024-11-10T14:30:00Z",
    "clinics": [
      {
        "id": 1,
        "name": "Klinik Gigi Sehat Prima",
        "address": "Jl. Sudirman No. 123, Jakarta Selatan, DKI Jakarta 12190",
        "city": "Jakarta",
        "phone_number": "021-5678910",
        "role": "dentist",
        "is_active": true
      },
      {
        "id": 2,
        "name": "Dental Care Center",
        "address": "Jl. Gatot Subroto No. 45, Jakarta Pusat, DKI Jakarta 10270",
        "city": "Jakarta",
        "phone_number": "021-9876543",
        "role": "dentist",
        "is_active": true
      }
    ]
  }
}
```

---

## ✅ Data Summary Checklist

### **✅ Available Data (Ready to Use)**
- [x] Basic Info (Name, Avatar, Email, Phone)
- [x] Professional Credentials (License, Registration, Verification)
- [x] Specialization & Education
- [x] Services Offered (Array)
- [x] Consultation Types (Array)
- [x] Consultation Fee
- [x] Insurance & BPJS Acceptance
- [x] Emergency Availability
- [x] Multiple Clinic Locations (Array)
- [x] Working Hours
- [x] Years of Experience
- [x] Member Since Date

### **⏳ Future Features (Not Yet in Database)**
- [ ] Rating & Reviews
- [ ] Patient Testimonials
- [ ] About/Bio Section
- [ ] Languages Spoken
- [ ] Professional Certifications (separate from education)
- [ ] Awards & Achievements
- [ ] Published Articles/Research
- [ ] Photo Gallery (clinic, equipment, results)
- [ ] Video Introduction
- [ ] Treatment Before/After Photos

---

## 🎨 UI Component Examples

### **Verification Badge Component**

```jsx
{dentist.is_verified && (
  <VerifiedBadge>
    <Icon name="check-circle" color="#00BFA6" size={16} />
    <BadgeText>Verified by SereneAI</BadgeText>
    <Tooltip>
      Credentials verified on {formatDate(dentist.verification_date)}
    </Tooltip>
  </VerifiedBadge>
)}
```

### **Services Grid Component**

```jsx
<ServicesGrid columns={2}>
  {dentist.services_offered.map(service => (
    <ServiceCard key={service}>
      <ServiceIcon name={getServiceIcon(service)} />
      <ServiceName>{service}</ServiceName>
    </ServiceCard>
  ))}
</ServicesGrid>
```

### **Consultation Types Component**

```jsx
<ConsultationTypes>
  {dentist.consultation_types.includes('in-person') && (
    <TypeChip color="#00BFA6">
      <Icon name="hospital" /> In-Person
    </TypeChip>
  )}
  {dentist.consultation_types.includes('teleconsult') && (
    <TypeChip color="#1976D2">
      <Icon name="video" /> Video Call
    </TypeChip>
  )}
  {dentist.consultation_types.includes('emergency') && (
    <TypeChip color="#F44336">
      <Icon name="alert" /> Emergency 24/7
    </TypeChip>
  )}
</ConsultationTypes>
```

---

## 🚀 Implementation Tips

### **1. Image Loading**
```javascript
// Handle missing avatar gracefully
const avatarSource = dentist.avatar_url 
  ? { uri: dentist.avatar_url }
  : require('@/assets/default-dentist-avatar.png');
```

### **2. Phone Number Formatting**
```javascript
// Format Indonesian phone numbers
const formatPhoneNumber = (phone) => {
  if (phone.startsWith('+62')) {
    return phone.replace('+62', '0');
  }
  return phone;
};
```

### **3. Price Formatting**
```javascript
// Format currency
const formatPrice = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
};

// Usage: formatPrice(150000) => "Rp 150.000"
```

### **4. Date Formatting**
```javascript
// Format dates
const formatDate = (dateString, format = 'dd MMM yyyy') => {
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(dateString));
};
```

### **5. Deep Linking**
```javascript
// Open phone dialer
const callDentist = (phoneNumber) => {
  Linking.openURL(`tel:${phoneNumber}`);
};

// Open maps
const openMap = (address) => {
  const encodedAddress = encodeURIComponent(address);
  const url = Platform.select({
    ios: `maps:0,0?q=${encodedAddress}`,
    android: `geo:0,0?q=${encodedAddress}`
  });
  Linking.openURL(url);
};
```

---

## 📊 Data Priority for MVP

### **Must Have (P0):**
1. ✅ Name, Avatar, Title
2. ✅ Specialization
3. ✅ **STR Number (License Number)** - WAJIB untuk kepercayaan patient
4. ✅ Verified Status
5. ✅ Services Offered
6. ✅ Consultation Fee
7. ✅ Phone Number (Call button)
8. ✅ Clinic Location(s)
9. ✅ Book Appointment button

### **Should Have (P1):**
9. ✅ Education
10. ✅ Years of Experience
11. ✅ STR Issuing Body & Expiry Date
12. ✅ Consultation Types
13. ✅ Insurance/BPJS
14. ✅ Working Hours
15. ✅ Emergency Availability

### **Nice to Have (P2):**
16. ⏳ Rating & Reviews
17. ⏳ About/Bio
18. ⏳ Photo Gallery
19. ⏳ Patient Testimonials
20. ⏳ Languages Spoken

---

**Last Updated:** November 14, 2025  
**Version:** 1.0.0  
**Total Fields Available:** 30+  
**API Endpoint:** `/api/dentists/:id`
