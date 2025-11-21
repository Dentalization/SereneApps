# Clinic Services & Public Profile Implementation

## 📋 Overview
Implementasi sistem manajemen services, gallery, highlights, dan facilities untuk clinic portal yang terintegrasi dengan mobile app.

## 🎯 Features Implemented

### 1. Database Schema (Migration: 027)
✅ **Tables Created:**
- `clinic_services` - Layanan tingkat klinik (dikelola owner/manager)
- `dentist_services` - Layanan spesifik dokter (untuk independent dentist)
- `service_dentist_assignments` - Assignment layanan ke dokter
- `clinic_gallery` - Foto klinik (hero, cover, facility)
- `clinic_highlights` - Keunggulan klinik
- `clinic_facilities` - Fasilitas klinik

✅ **Features:**
- Auto-incrementing IDs (BIGSERIAL)
- Foreign key constraints with CASCADE delete
- Updated_at triggers for all tables
- Display order for sorting
- Active/inactive status flags
- Support untuk custom pricing per dentist

### 2. Backend API Endpoints

#### Clinic Services API (`/v1/clinic/services`)
```
GET    /v1/clinic/services              - List all services
GET    /v1/clinic/services/:id          - Get service details with assignments
POST   /v1/clinic/services              - Create new service
PUT    /v1/clinic/services/:id          - Update service
DELETE /v1/clinic/services/:id          - Delete/deactivate service
POST   /v1/clinic/services/:id/assign-dentist    - Assign to dentist(s)
DELETE /v1/clinic/services/:id/unassign-dentist/:dentistId - Remove assignment
```

**Permissions:** Requires `owner` or `manager` role

#### Clinic Profile API (`/v1/clinic/...`)
```
GET    /v1/clinic/gallery               - List gallery images
POST   /v1/clinic/gallery               - Upload image (multipart/form-data)
PUT    /v1/clinic/gallery/:id           - Update image metadata
DELETE /v1/clinic/gallery/:id           - Delete image

GET    /v1/clinic/highlights            - List highlights
POST   /v1/clinic/highlights            - Add highlight
PUT    /v1/clinic/highlights/:id        - Update highlight
DELETE /v1/clinic/highlights/:id        - Delete highlight

GET    /v1/clinic/facilities            - List facilities
POST   /v1/clinic/facilities            - Add facility
PUT    /v1/clinic/facilities/:id        - Update facility
DELETE /v1/clinic/facilities/:id        - Delete facility
```

**Permissions:** Requires `owner` or `manager` role

### 3. Web Portal UI

#### New Pages:
- **Public Profile** (`/clinic-portal/public-profile`)
  - Services Management (Full CRUD implemented)
  - Gallery Management (Placeholder)
  - Highlights Management (Placeholder)
  - Facilities Management (Placeholder)

#### Services Management Features:
✅ Add/Edit/Delete services
✅ Category tabs (All/General/Specialist)
✅ Pricing management
✅ Duration configuration
✅ Specialty selection for specialist services
✅ Active/inactive status toggle
✅ Assigned dentists count display
✅ MUI components with responsive design

#### Menu Integration:
✅ Added "Public Profile" to clinic portal menu
✅ Role permissions (owner, manager only)
✅ Icon: Globe

### 4. Data Model

#### Service Structure:
```javascript
{
  id: bigint,
  name: string,
  description: string,
  base_price: decimal(10,2),
  category: 'general' | 'specialist',
  specialty: string | null,
  duration_minutes: integer,
  is_available_for_all_dentists: boolean,
  is_active: boolean,
  assigned_dentists_count: integer (computed)
}
```

#### Pricing Logic:
1. **Clinic-Level Pricing**: 
   - Owner/Manager sets base price
   - Applies to all dentists (unless custom price set)

2. **Dentist-Level Pricing**:
   - Independent dentist: Full control over their services
   - Clinic dentist: Read-only (clinic sets pricing)

3. **Custom Pricing**:
   - Clinic can set custom price per dentist for specific services
   - Falls back to base_price if custom_price is NULL

## 🚀 How to Use

### For Clinic Owners/Managers:

1. **Add Services:**
   ```
   Portal → Public Profile → Services & Pricing → Add Service
   - Enter service name, description
   - Set category (General/Specialist)
   - Set base price and duration
   - Toggle "Available for all dentists" if needed
   ```

2. **Assign to Dentists:**
   ```
   Coming soon: Dentist assignment modal
   - Select which dentists can perform the service
   - Set custom pricing per dentist (optional)
   ```

3. **Manage Gallery:**
   ```
   Portal → Public Profile → Gallery & Photos
   (To be implemented)
   ```

## 📱 Mobile App Integration

### Current State:
Mobile app uses **hardcoded data** from:
- `/mobile/src/features/appointment/data/appointments.js`
- `/mobile/src/features/dashboard/data/clinics.js`

### Next Steps:
- [ ] Create API endpoint: `GET /v1/clinics/:id/public-profile`
- [ ] Update `ClinicDetailScreen.jsx` to fetch services from API
- [ ] Update `DentistDetailScreen.jsx` to fetch dentist services
- [ ] Add loading states and error handling

## 🔐 Security

- ✅ Authentication required (JWT token)
- ✅ Role-based access control (owner/manager only)
- ✅ Clinic branch isolation (users can only manage their own clinic)
- ✅ Foreign key constraints prevent orphaned data
- ✅ Soft delete for services (can be recovered)

## 📦 Dependencies

### Backend:
- Express.js
- PostgreSQL (pg pool)
- Multer (for image uploads)

### Frontend:
- React
- Material-UI (MUI)
- authHttp utility for authenticated requests

## 🧪 Testing Checklist

### Backend:
- [ ] Restart backend server (`npm run dev`)
- [ ] Test POST /v1/clinic/services (create service)
- [ ] Test GET /v1/clinic/services (list services)
- [ ] Test PUT /v1/clinic/services/:id (update service)
- [ ] Test DELETE /v1/clinic/services/:id (soft delete)
- [ ] Verify permissions (non-owner/manager should get 403)

### Frontend:
- [ ] Login as clinic owner/manager
- [ ] Navigate to Public Profile → Services & Pricing
- [ ] Create new service
- [ ] Edit existing service
- [ ] Delete service
- [ ] Verify data persists after page refresh

### Mobile App (After Integration):
- [ ] Clinic detail screen shows real services
- [ ] Service prices display correctly
- [ ] Service categories work
- [ ] Dentist detail shows specialist services

## 📝 Future Enhancements

### Gallery Management:
- Drag-and-drop image upload
- Image cropping and optimization
- Gallery reordering
- Image type categorization (hero, cover, facility)

### Highlights Management:
- Icon picker integration
- Drag-and-drop reordering
- Predefined highlight templates
- Multi-language support

### Facilities Management:
- Icon picker
- Rich text editor for descriptions
- Photo attachments per facility

### Dentist Services:
- Independent dentist portal
- Self-service pricing management
- Availability calendar integration

### Advanced Features:
- Service packages/bundles
- Promotional pricing
- Seasonal discounts
- Service popularity analytics

## 🐛 Known Issues

1. **Image Upload**: Gallery upload endpoint created but frontend not implemented
2. **Dentist Assignment**: Backend ready but UI modal not implemented
3. **Mobile API**: No public endpoint yet for mobile to fetch services

## 📚 API Documentation

Full API documentation available at:
```
http://localhost:4000/api-docs
```

## 🔄 Migration Commands

```bash
# Run migration
cd backend
psql -U postgres -d serene -f migrations/027_add_services_tables.sql

# Verify tables
psql -U postgres -d serene -c "\d clinic_services"
psql -U postgres -d serene -c "\d dentist_services"
```

## 📊 Database Diagram

```
clinic_branches
    ├── clinic_services (one-to-many)
    │   └── service_dentist_assignments (many-to-many)
    │       └── dentist_profiles
    ├── clinic_gallery (one-to-many)
    ├── clinic_highlights (one-to-many)
    └── clinic_facilities (one-to-many)

dentist_profiles
    └── dentist_services (one-to-many)
```

## 👥 Contributors

- Backend API: ✅ Implemented
- Database Schema: ✅ Implemented
- Frontend UI: ✅ Services Management complete, others placeholder
- Mobile Integration: ⏳ Pending

---

**Status**: 🟢 Core features implemented, ready for testing
**Next Priority**: Mobile app API integration
