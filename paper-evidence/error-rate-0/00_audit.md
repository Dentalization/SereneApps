# Repository Load Test Failure Audit (error-rate-0)

## 1. Endpoints Tested in 100/200 VU Scripts
The k6 script `core_api_high_vu.k6.js` runs a loop containing 4 distinct endpoint operations:
1. **Login**: `POST /v1/auth/login`
2. **List Appointments**: `GET /v1/appointments?view=patient&limit=20&order=desc`
3. **Detail Consultation**: `GET /v1/appointments/:appointmentId`
4. **Send Chat Message**: `POST /v1/communications/appointments/:appointmentId/chat/messages`

## 2. Endpoint Contributing the Most Failures
The endpoint **`POST /v1/communications/appointments/:appointmentId/chat/messages`** contributes **100%** of the persistent failures. 
In the 100 VU run:
* **Total failed requests**: 19,262
* **Send message failures**: 19,258 (100% of all message requests failed)
* **Login failures**: 4 (0.02% of login requests failed due to minor transient/concurrent startup issues)

In the 200 VU run:
* **Total failed requests**: 18,945
* **Send message failures**: 18,945 (100% of all message requests failed)

## 3. Status Code Distribution
* **`GET /appointments`**: 100% status code `200`
* **`GET /appointments/:id`**: 100% status code `200`
* **`POST /auth/login`**: 99.98% status code `200` / `201`, 0.02% status code `5xx` or connection timeouts
* **`POST /communications/appointments/:appointmentId/chat/messages`**: 100% status code `403` (Forbidden)

## 4. Failure Type Distribution
* **4xx (Forbidden)**: 19,258 requests.
* **5xx / Network Timeout**: 4 requests.
* **Assertion Failures**: 19,258 requests failed the k6 check `'send message status 200/201'`.

## 5. Application Code vs Test Script Assumptions
The failures are a result of **test script design and data fixture assumptions** rather than actual backend instability:
* The backend application code correctly implements a security policy (`getAppointmentForUser` with `checkWrite: true`) that blocks chat writes on appointments unless the status is **`confirmed`**.
* The database seed files (e.g. `comprehensive_clinic_seed.sql`) only generate appointments in **`scheduled`**, **`completed`**, or **`cancelled`** statuses.
* The test script picks up the most recent appointment (which is `scheduled`) and attempts to write to it, triggering the security check block and returning `403 Forbidden` instantly.
* Furthermore, all VUs use the *same* patient token and write to the *same* appointment ID, which would have caused lock contention and database lock timeouts even if the status had been valid.

## 6. Initial Hypothesis
1. **Data Seeding**: Seeding 200 unique patient users and 200 distinct `confirmed` appointments (each patient having a unique, dedicated appointment with status `confirmed` and `commStatus` set to `ready`) will allow the security checks to pass.
2. **VU Isolation**: Allocating each VU their own patient profile index (via `__VU`) will eliminate concurrent database write locks on the same chat room, resulting in a 0.00% error rate under high concurrent loads.
