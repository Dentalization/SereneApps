# Mobile API Contract

This reference consolidates the endpoints that the SereneAI mobile clients rely on for the MVP patient journey. All paths are versioned under `/v1`.

> Base URL (local): `http://localhost:4000/v1`
>
> Authorization: Bearer access token in the `Authorization` header (`Authorization: Bearer <token>`)

---

## Authentication

### Register Patient
- **POST** `/auth/patient/register`
- **Body**
  ```json
  {
    "name": "Jane Patient",
    "email": "jane@example.com",
    "password": "Secret123!",
    "phoneNumber": "+6281234567890"
  }
  ```
- **201 Response**
  ```json
  {
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>",
    "user": {
      "id": "123",
      "name": "Jane Patient",
      "email": "jane@example.com",
      "roles": ["patient"]
    },
    "patientProfile": {
      "preferredLanguage": "id"
    }
  }
  ```
- **Validation error (400)**
  ```json
  {
    "message": "Validation error",
    "errors": ["Email is required"]
  }
  ```

### Login
- **POST** `/auth/login`
- **Body** `{ "email": "jane@example.com", "password": "Secret123!" }`
- **200 Response** Same shape as register.

### Refresh Access Token
- **POST** `/auth/refresh`
- **Body** `{ "refreshToken": "<jwt>" }`

---

## Appointments

### Check Availability
- **GET** `/appointments/availability?dentistId=42&date=2024-11-12`
- **Notes**: returns time slots in ISO8601, respects dentist working hours.

### List Appointments
- **GET** `/appointments`
- **Query Params**
  - `view` = `patient` | `dentist` | `clinic`
  - `includeHistory` = `true`
  - `from`, `to` = ISO8601 timestamps
- **200 Response**
  ```json
  {
    "view": "patient",
    "summary": { "total": 4, "byStatus": { "confirmed": 2 } },
    "appointments": [
      {
        "id": "105",
        "dentistId": "42",
        "patientId": "123",
        "startsAt": "2024-11-30T08:00:00.000Z",
        "endsAt": "2024-11-30T08:30:00.000Z",
        "status": "confirmed",
        "reason": "Kontrol",
        "dentist": { "name": "drg. Adi" },
        "patient": { "name": "Jane Patient" }
      }
    ]
  }
  ```

### Book Appointment (patient)
- **POST** `/appointments`
- **Body**
  ```json
  {
    "dentistId": "42",
    "start": "2024-12-01T09:00:00.000Z",
    "end": "2024-12-01T09:30:00.000Z",
    "reason": "Nyeri gigi"
  }
  ```
- **Success (201)**
  ```json
  {
    "appointment": {
      "id": "110",
      "status": "scheduled",
      "startsAt": "2024-12-01T09:00:00.000Z",
      "endsAt": "2024-12-01T09:30:00.000Z",
      "dentist": { "name": "drg. Adi" },
      "patient": { "name": "Jane Patient" }
    }
  }
  ```
- **Slot taken (409)**
  ```json
  {
    "error": {
      "code": "slot_taken",
      "message": "Waktu yang dipilih baru saja terisi. Silakan pilih slot lain."
    }
  }
  ```

### Reschedule Appointment (patient)
- **PATCH** `/appointments/{appointmentId}/reschedule`
- **Body**
  ```json
  {
    "startsAt": "2024-12-02T09:00:00.000Z",
    "endsAt": "2024-12-02T09:30:00.000Z",
    "reason": "Ada agenda mendadak"
  }
  ```
- **Window elapsed (400)**
  ```json
  {
    "error": {
      "code": "reschedule_window_elapsed",
      "message": "Penjadwalan ulang hanya bisa dilakukan minimal 24 jam sebelum janji temu."
    }
  }
  ```

### Cancel Appointment (patient)
- **PATCH** `/appointments/{appointmentId}/cancel`
- **Body** `{ "reason": "Sakit" }`
- **Success (200)** returns updated appointment.

---

## Payments

> Requires `MIDTRANS_MOCK_MODE=true` in `.env` for local development.

### Create Payment Intent (patient)
- **POST** `/payments`
- **Body**
  ```json
  {
    "appointmentId": "110",
    "amount": 150000,
    "currency": "IDR"
  }
  ```
- **201 Response**
  ```json
  {
    "paymentIntent": {
      "id": "55",
      "appointmentId": "110",
      "status": "requires_action",
      "redirectUrl": "https://example.com/mock-payment/55"
    },
    "provider": {
      "name": "midtrans",
      "redirectUrl": "https://example.com/mock-payment/55",
      "clientKey": "mock-client-key"
    }
  }
  ```

### Confirm Payment Status (patient)
- **POST** `/payments/{intentId}/confirm`
- **Body** `{ "status": "succeeded" }`

### Midtrans Webhook (server)
- **POST** `/payments/webhooks/midtrans`
- Use in staging/production only. Mock mode bypasses signature verification.

---

## Communications

### List Chat Rooms
- **GET** `/communications/rooms`

### Fetch Messages & Join Room
- **GET** `/communications/appointments/{appointmentId}/chat/messages`

### Send Chat Message
- **POST** `/communications/appointments/{appointmentId}/chat/messages`
  ```json
  {
    "message": "Halo dokter, saya ingin konfirmasi janji besok",
    "messageType": "text"
  }
  ```

### Upload Attachment
- **POST** `/communications/appointments/{appointmentId}/chat/attachments`
  - Multipart form-data (`file` field)

### Generate Video Token
- **POST** `/communications/appointments/{appointmentId}/video/token`
  ```json
  {
    "role": "publisher",
    "expireSeconds": 3600
  }
  ```

### Register Push Device
- **POST** `/notifications/devices`
  ```json
  {
    "token": "device-token",
    "provider": "fcm",
    "platform": "ios"
  }
  ```

### Update Notification Preferences
- **PUT** `/notifications/preferences`
  ```json
  {
    "preferences": [
      { "eventType": "appointment_reminder", "channel": "push", "enabled": true },
      { "eventType": "appointment_rescheduled", "channel": "sms", "enabled": false }
    ]
  }
  ```

---

## Error Format

All newly hardened endpoints return errors in the following shape:

```json
{
  "error": {
    "code": "slot_taken",
    "message": "Waktu yang dipilih baru saja terisi. Silakan pilih slot lain.",
    "details": {
      "appointmentId": "110"
    }
  }
}
```

Mobile clients should rely on the `code` for control-flow decisions and display the localized `message` to end users.

---

## Postman Collection

The accompanying Postman collection (`docs/collections/mobile-api.postman_collection.json`) mirrors the routes above with environment variables for `{{baseUrl}}` and `{{accessToken}}`.
