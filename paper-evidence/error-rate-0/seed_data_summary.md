# Load Test Seed Data Summary

## Seeding Details
* **Number of users created**: 200 patient users (`patient.load1@example.com` to `patient.load200@example.com`)
* **Number of patient profiles created**: 200 profiles associated with the load test patients
* **Number of appointments created**: 200 appointments in `confirmed` status with `comm_status = 'ready'`
* **Number of chat rooms created**: 200 chat rooms (`room-load-patient-1` to `room-load-patient-200`) with mock Twilio conversation SIDs
* **Number of chat room members created**: 400 memberships (patient and dentist mapped to each room)

## Resource Allocation per VU
Each virtual user (VU) in the k6 execution gets a **unique, isolated set of resources** based on its VU index (`__VU` in k6):
* **VU `i`** logs in as **`patient.load{i}@example.com`**.
* **VU `i`** reads and writes to its dedicated appointment **`room-load-patient-{i}`**.
* This design completely isolates each VU's transaction flow and eliminates database lock contention and collision overhead.

## Cleanup Instructions
The seed script `paper-evidence/scripts/seed-load-test-data.cjs` automatically performs deterministic cleanup at the start of every execution.
To manually clean up the database:
```sql
DELETE FROM users WHERE email LIKE 'patient.load%@example.com';
```
This cascade-deletes all associated patient profiles, appointments, chat rooms, and chat room memberships.
