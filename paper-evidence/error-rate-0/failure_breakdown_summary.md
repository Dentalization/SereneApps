# Failure Breakdown Summary

This document classifies and analyzes the errors observed before and after implementing the stabilization plan.

## 1. Initial State (25.00% Error Rate)
- **Scenarios Affected**: 100 VU and 200 VU
- **Error Count**: Exactly 1 out of every 4 requests per iteration failed.
- **Failures Classification**:
  - **Endpoint**: `POST /communications/appointments/:id/chat/messages`
  - **Status Code**: `403 Forbidden`
  - **Category**: Auth Failure (Logical Block)
  - **Root Cause**: The test script lacked patient isolation and concurrent VUs attempted to send messages to a single shared appointment in `scheduled` status. The application code correctly rejected writes to appointments that were not `confirmed`.

## 2. Intermediate State (0.55% Error Rate)
- **Scenarios Affected**: 100 VU (with seeded credentials and isolated appointments)
- **Error Count**: 336 errors out of 60,780 requests.
- **Failures Classification**:
  - **Logins (Count: 184)**:
    - **Endpoint**: `POST /auth/login`
    - **Status Code**: `500 Internal Server Error`
    - **Category**: Database Pool Starvation
  - **Chat Messages (Count: 149)**:
    - **Endpoint**: `POST /communications/appointments/:id/chat/messages`
    - **Status Code**: `403 Forbidden`
    - **Category**: Auth Failure (Cascading from DB issue)
  - **Root Cause**: Over 60 route and service modules created separate `PrismaClient` instances. Concurrency exhausted PostgreSQL's `max_connections` (100). The database returned `FATAL: sorry, too many clients already`.

## 3. Final Stabilized State (0.00% Error Rate)
- **Scenarios Affected**: 100 VU and 200 VU
- **Error Count**: Exactly **0** errors.
- **Failures Classification**: None. All assertions passed.
- **Resolutions**:
  - **Data Seeding**: Seeding 200 isolated patients and 200 confirmed appointments.
  - **Singleton Client**: Shared connection pool via PrismaClient wrapping.
  - **Mock Externals**: Bypassing external service delays (Twilio/Midtrans) using `BENCHMARK_MOCK_EXTERNALS=true`.
