# Phantom Booking Issue - Debug Guide

## Problem Summary

**Critical Issue**: Mobile app reports successful booking with ID (e.g., `SRN-000002`), but the appointment doesn't exist in the database.

### Evidence
1. **Mobile App**: Shows success screen with booking code `SRN-000002`
2. **Database**: 
   - `appointments` table: Only 1 row (cancelled Friday appointment)
   - `appointment_status_history` table: 0 rows (completely empty)
3. **Conclusion**: Either transaction rollback after response, or database connection issue

---

## Debugging Enhancements Applied

### 1. Backend Logging (`backend/src/routes/appointments.js`)

Added comprehensive console.log statements to trace:
- ✅ Request received with full payload
- ✅ Validation steps (dentist check, clinic resolution, slot availability)
- ✅ Appointment creation within transaction
- ✅ Status history recording
- ✅ **POST-COMMIT VERIFICATION** - Checks if appointment exists after transaction
- ✅ Response structure validation
- ✅ Error handling with detailed context

### 2. Prisma Query Logging

Enabled Prisma query logging to see exact SQL:
```javascript
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn']
});
```

### 3. Status History Logging (`backend/src/services/appointments/audit.js`)

Added logging to `recordStatusChange` function to trace:
- Parameters received
- Status history creation
- Result confirmation

### 4. Critical Verification Check

Added **POST-COMMIT VERIFICATION** that will catch phantom appointments:
```javascript
// After transaction commits
const verifyPostCommit = await prisma.appointment.findUnique({
  where: { id: createdAppointment.id },
  select: { id: true, status: true, startsAt: true }
});

if (!verifyPostCommit) {
  console.error('CRITICAL: Appointment does not exist after transaction commit!');
  throw new Error('PHANTOM_APPOINTMENT: Transaction committed but data missing');
}
```

---

## Testing Instructions

### Method 1: Use Test Script

1. **Update credentials** in `backend/test-appointment-creation.js`:
   ```javascript
   const TEST_PATIENT_TOKEN = 'your_valid_token_here';
   const TEST_DENTIST_PROFILE_ID = 1; // Valid dentist profile ID
   const TEST_CLINIC_BRANCH_ID = 1;   // Valid clinic branch ID
   ```

2. **Run the test**:
   ```bash
   cd /Users/adrianhalim/SereneApps/backend
   node test-appointment-creation.js
   ```

3. **Check backend logs** for:
   - `[APPOINTMENT POST] Request received:`
   - `[APPOINTMENT POST] Appointment created IN TRANSACTION:`
   - `[APPOINTMENT POST] Transaction committed successfully`
   - `[APPOINTMENT POST] POST-COMMIT VERIFICATION:`
   - `[APPOINTMENT POST] SUCCESS - Appointment created`

### Method 2: Use Mobile App

1. **Open mobile app** on your device/emulator
2. **Book an appointment** (Saturday or any future date)
3. **Monitor backend terminal** for logs in real-time
4. **Check database immediately**:
   ```sql
   -- Check appointments
   SELECT id, dentist_id, patient_id, starts_at, status, created_at 
   FROM appointments 
   ORDER BY id DESC LIMIT 5;
   
   -- Check status history
   SELECT id, appointment_id, new_status, created_at 
   FROM appointment_status_history 
   ORDER BY id DESC LIMIT 5;
   ```

---

## Log Patterns to Look For

### ✅ SUCCESSFUL CREATION (Expected):
```
[APPOINTMENT POST] Request received: { patientId: '288', dentistIdRaw: 1, ... }
[APPOINTMENT POST] Validation passed: { dentistId: '2', patientId: '288', ... }
[APPOINTMENT POST] Transaction started
[APPOINTMENT POST] Advisory lock acquired
[APPOINTMENT POST] No conflicts, creating appointment
[APPOINTMENT POST] Appointment created IN TRANSACTION: { id: '2', dentistId: '2', ... }
[recordStatusChange] Creating status history: { appointmentId: '2', newStatus: 'scheduled', ... }
[recordStatusChange] ✅ Status history created: { id: '1' }
[APPOINTMENT POST] ✅ Transaction committed successfully, appointment ID: 2
[APPOINTMENT POST] 🔍 POST-COMMIT VERIFICATION: { id: '2', status: 'scheduled', ... }
[APPOINTMENT POST] SUCCESS - Appointment created and responding: { appointmentId: '2', ... }
```

### ❌ PHANTOM BOOKING (Problem):
```
[APPOINTMENT POST] Request received: ...
[APPOINTMENT POST] Appointment created IN TRANSACTION: { id: '2', ... }
[APPOINTMENT POST] ✅ Transaction committed successfully, appointment ID: 2
[APPOINTMENT POST] 🔍 POST-COMMIT VERIFICATION: null
[APPOINTMENT POST] ❌ CRITICAL: Appointment ID 2 does not exist after transaction commit!
[APPOINTMENT POST] Error caught: { message: 'PHANTOM_APPOINTMENT: Transaction committed but data missing' }
```

### ❌ SLOT CONFLICT:
```
[APPOINTMENT POST] Error: Slot conflict detected { overlapping: { id: 'X' } }
[APPOINTMENT POST] Returning 409: Slot taken
```

---

## Potential Root Causes

### 1. **Database Connection Pool Issue**
- **Symptom**: Different Prisma instances writing to different connections
- **Solution**: Verify `.env` DATABASE_URL is correct
- **Check**:
  ```bash
  echo $DATABASE_URL
  cat backend/.env | grep DATABASE_URL
  ```

### 2. **Transaction Rollback After Response**
- **Symptom**: Response sent but transaction rolls back
- **Solution**: POST-COMMIT verification will catch this
- **Check**: Look for "POST-COMMIT VERIFICATION: null" in logs

### 3. **Prisma Schema Mismatch**
- **Symptom**: Field names don't match database columns
- **Solution**: Regenerate Prisma client
- **Fix**:
  ```bash
  cd backend
  npx prisma generate
  npm start
  ```

### 4. **Silent Status History Failure**
- **Symptom**: Status history creation fails, causing rollback
- **Solution**: Logging added to `recordStatusChange` will show this
- **Check**: Look for `[recordStatusChange]` logs

### 5. **Client-Side ID Generation**
- **Symptom**: Mobile generates ID using `Date.now()`
- **Solution**: Check if `response.data?.id` exists
- **Current Code** (PaymentScreen.jsx line 189):
  ```javascript
  const appointmentId = response.data?.id || Date.now();
  ```
  If server doesn't return ID, it uses timestamp which could be `SRN-849600000`

---

## Next Steps

1. ✅ **Backend is now running** with comprehensive logging
2. ⏳ **Test appointment creation** using either method above
3. 🔍 **Analyze logs** to identify where data disappears
4. 🐛 **Fix root cause** based on log patterns
5. ✅ **Verify fix** by checking database after successful booking

---

## Database Verification Queries

```sql
-- Check total appointments
SELECT COUNT(*) FROM appointments;

-- Check appointments with status history
SELECT 
  a.id, 
  a.status, 
  a.starts_at,
  COUNT(ash.id) as history_count
FROM appointments a
LEFT JOIN appointment_status_history ash ON ash.appointment_id = a.id
GROUP BY a.id, a.status, a.starts_at
ORDER BY a.id DESC;

-- Check orphaned status history (should be 0)
SELECT COUNT(*) 
FROM appointment_status_history ash
WHERE NOT EXISTS (
  SELECT 1 FROM appointments a WHERE a.id = ash.appointment_id
);
```

---

## Files Modified

1. `backend/src/routes/appointments.js` - Added comprehensive logging
2. `backend/src/services/appointments/audit.js` - Added status history logging
3. `backend/test-appointment-creation.js` - Created test script

---

## Contact Points for Support

- **Backend logs**: `backend/backend_debug.log` or terminal output
- **Database**: Run queries above to verify state
- **Test script**: `backend/test-appointment-creation.js`

**Status**: 🟡 Debugging tools deployed, awaiting test results
