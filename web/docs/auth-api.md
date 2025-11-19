# Auth API Contract (Expected by Frontend)

Base URL: `${VITE_SERENE_API_BASE_URL}/${VITE_SERENE_API_VERSION}`

## POST /auth/login
Request
```
{ "email": "user@example.com", "password": "string" }
```
Response (200)
```
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt-or-opaque>",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "roles": ["dentist" | "admin" | "patient"]
  }
}
```

## POST /auth/patient/register
Request
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "supersecure",
  "phoneNumber": "+628123456789",
  "dateOfBirth": "1990-05-21",
  "gender": "female",
  "insuranceProvider": "BPJS",
  "insuranceNumber": "1234567890",
  "insuranceMemberId": "BPJS-123456",
  "medicalNotes": "Allergic to penicillin",
  "allergies": ["penicillin"],
  "chronicConditions": ["hypertension"],
  "medications": ["lisinopril"],
  "preferredLanguage": "id",
  "emergencyContactName": "John Doe",
  "emergencyContactPhone": "+628987654321",
  "emergencyContactRelationship": "Husband",
  "addressLine1": "Jl. Sudirman No. 5",
  "addressLine2": "Kebayoran Baru",
  "city": "Jakarta",
  "province": "DKI Jakarta",
  "postalCode": "10210"
}
```
Response (201)
```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>",
  "user": {
    "id": "uuid",
    "email": "jane@example.com",
    "name": "Jane Doe",
    "roles": ["patient"]
  },
  "patientProfile": {
    "dateOfBirth": "1990-05-21",
    "gender": "female",
    "insuranceProvider": "BPJS",
    "insuranceNumber": "1234567890",
    "insuranceMemberId": "BPJS-123456",
    "emergencyContact": {
      "name": "John Doe",
      "phone": "+628987654321",
      "relationship": "Husband"
    },
    "address": {
      "line1": "Jl. Sudirman No. 5",
      "line2": "Kebayoran Baru",
      "city": "Jakarta",
      "province": "DKI Jakarta",
      "postalCode": "10210"
    },
    "medicalDetails": {
      "notes": "Allergic to penicillin",
      "allergies": ["penicillin"],
      "chronicConditions": ["hypertension"],
      "medications": ["lisinopril"]
    },
    "preferredLanguage": "id"
  }
}
```

## POST /auth/refresh
Request
```
{ "refreshToken": "<token>" }
```
Response (200)
```
{ "accessToken": "<jwt>", "refreshToken": "<token-optional>" }
```

## GET /auth/me
Response (200)
```
{ "id": "uuid", "email": "user@example.com", "roles": ["dentist"] }
```

## POST /auth/logout (optional)
No body required. Invalidates refresh token server-side.

## Notes
- JWT should encode expiry (`exp`). Backend should validate tokens and enforce RBAC.
- If your backend uses cookie-based sessions instead of JWT, remove the Authorization header logic and rely on `withCredentials` + CORS.
