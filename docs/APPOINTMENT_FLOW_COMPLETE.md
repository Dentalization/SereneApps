# Appointment Flow Reference

This document acts as the single source of truth for the appointment feature that lives under `mobile/src/features/appointment`. It covers:

1. **User journey** from searching a clinic → selecting a dentist → picking a slot → confirming and managing bookings.
2. **Data contracts** for each screen/state so that we can eventually swap the mocked data with the backend API without refactoring the UI.
3. **UI/UX guidelines** to keep the experience consistent across list/slot/confirmation surfaces.

---

## 1. Journey Overview

| Step | Screen | Purpose | Key Actions |
| --- | --- | --- | --- |
| 1 | `ClinicSearchScreen` | Filter/search clinics & dentists | search, apply filters, open clinic detail |
| 2 | `ClinicDetailScreen` | Preview clinic roster & equipment | choose dentist, view gallery, navigate to slot picker |
| 3 | `BookingSlotScreen` | Select date & time slot | switch dates, pick slot, toggle virtual vs onsite |
| 4 | `BookingConfirmScreen` | Review summary & payment | pick payment method, add notes, confirm |
| 5 | `AppointmentListScreen` | Manage upcoming / past bookings | reschedule, cancel, join virtual call |

---

## 2. Data Contracts

### Appointment Entity

```ts
type Appointment = {
  id: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  type: 'onsite' | 'virtual';
  startsAt: string;      // ISO date
  endsAt: string;        // ISO date
  reason: string;
  clinic: {
    id: string;
    name: string;
    address: string;
  };
  dentist: {
    id: string;
    name: string;
    specialty: string;
    avatar: string;
  };
  actions: {
    canJoinCall?: boolean;
    canReschedule?: boolean;
    canCancel?: boolean;
  };
  billing: {
    fee: number;
    insuranceCovered?: number;
    method?: 'wallet' | 'card' | 'cash';
  };
};
```

### Slot Availability Payload

```ts
type SlotAvailability = {
  dentistId: string;
  date: string;                // ISO day
  slots: Array<{
    time: string;              // HH:mm (24h)
    duration: number;          // minutes
    type: 'onsite' | 'virtual';
    isAvailable: boolean;
  }>;
};
```

### Confirmation Payload

```ts
type BookingConfirmation = {
  appointment: Appointment;
  notes?: string;
  paymentMethod: 'card' | 'va' | 'cash';
  reminderMinutes: number;
};
```

---

## 3. UI Guidelines

### Appointment List
- Primary tabs: **Upcoming**, **Completed**.
- Each card shows: date chip, type pill (virtual/onsite), dentist avatar + clinic, reason, CTA row.
- CTAs:
  - Upcoming: `Join Call` (if virtual & within 15 minutes), `Reschedule`, `Cancel`.
  - Completed: `Book Again`.
- Empty state encourages starting a booking from Clinic Search.

### Slot Picker
- Sticky dentist header (avatar, rating, clinic distance).
- Horizontal date selector (min 7 days).
- Slot grid grouped by session (Morning/Afternoon/Evening).
- Toggle pill to switch between `Onsite` vs `Virtual`.
- Once a slot is selected, bottom sheet CTA `Lanjutkan`.

### Confirmation
- Step progress indicator (1. Pilih slot, 2. Konfirmasi, 3. Selesai).
- Summary card (date, time, dentist, clinic).
- Notes input + reminder dropdown.
- Payment method pills (Card, VA, Cash at clinic).
- CTA `Konfirmasi Janji Temu`.

---

## 4. Mock Data Location

Mocked appointments, slot availability, and dentists live under:

```
mobile/src/features/appointment/data/
  appointments.js
```

Each screen consumes the data through helper selectors (e.g. `getAppointmentsByStatus`, `getSlotAvailability(dentistId)`).

---

## 5. API Migration Checklist

1. Replace mocks with service calls inside a thin data layer.
2. Persist actions (reschedule/cancel) via mutation hooks; optimistically update Redux cache.
3. Ensure timezone handling by storing everything as ISO strings.
4. Log analytics events at each step (slot selected, confirmation success).

---

This document should evolve along with the product – keep it updated whenever a new flow, state, or data attribute is added.
