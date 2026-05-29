# Financial Ownership Audit

## Goal

Every patient payment has exactly one financial owner:

- `clinic`: clinic-owned appointment revenue.
- `dentist`: independent dentist-owned appointment revenue.

The stored value remains lowercase for backward compatibility with existing Prisma models and API contracts. In product language, `dentist` means `INDEPENDENT_DENTIST`, not a clinic-employed dentist payout.

## Current Runtime Surfaces

### Payment Creation

- `backend/src/routes/payments.js`
- `backend/src/routes/payments/snapTransactions.js`

Both routes resolve payment ownership from the appointment and persist `ownerType`, `ownerClinicId`, and `ownerDentistId` on `PaymentIntent`.

### Appointment Creation

- `backend/src/routes/appointments.js`

Appointments are classified as:

- clinic-owned when the selected dentist is clinic-affiliated and a clinic branch/profile is resolved.
- independent dentist-owned when the selected dentist is independent.

### Invoice and Ledger Projection

- `backend/src/services/payments/financials.js`
- `backend/src/services/payments/webhookHandler.js`
- `backend/src/services/payments/refundService.js`
- `backend/src/services/payments/snapshotService.js`

Invoices and financial ledger entries are derived from `PaymentIntent`/`Appointment` ownership. Settled snapshots still calculate clinic/dentist shares for payout reporting, but those shares are not the transaction owner.

### Financial Read APIs

- `GET /v1/financials/clinic/summary`
- `GET /v1/financials/clinic/history`
- `GET /v1/financials/clinic/analytics`
- `GET /v1/financials/dentist/summary`
- `GET /v1/financials/dentist/history`
- `GET /v1/financials/dentist/analytics`

Clinic endpoints filter by `ownerType = clinic` and `ownerClinicId`.
Dentist endpoints filter by `ownerType = dentist` and `ownerDentistId`.

## Prior Risk

The schema had ownership columns, but enforcement was split across call sites and not guaranteed by database constraints. A malformed row could be created with:

- both clinic and dentist owner IDs,
- no owner ID,
- a clinic owner type without a clinic ID,
- an independent dentist owner type without a dentist ID.

That kind of row can cause double counting or invisible revenue, depending on which dashboard reads it.

## Implemented Guardrails

- `backend/src/services/payments/ownership.js` is now the canonical ownership resolver.
- The resolver accepts legacy aliases (`CLINIC`, `INDEPENDENT_DENTIST`) and normalizes to stored values (`clinic`, `dentist`).
- The resolver throws before creating incomplete or ambiguous payment ownership.
- `backend/migrations/051_financial_ownership_constraints.sql` backfills ownership and adds check constraints on:
  - `appointments`
  - `payment_intents`
  - `invoices`
  - `financial_ledger_entries`
- The `financial_ledger_entries` constraint is added as `NOT VALID` so historical orphan ledger rows without an appointment/payment reference do not block deployment; PostgreSQL still enforces the constraint for new ledger entries.
- The same migration is available for Prisma deploy at:
  - `backend/prisma/migrations/20260529000000_financial_ownership_constraints/migration.sql`

## Rules Going Forward

- Dashboard revenue must read payment/invoice/ledger rows by owner fields, not by appointment dentist alone.
- Clinic-employed dentist earnings are payout/share reporting, not payment ownership.
- Independent dentist revenue is the only revenue that appears in the dentist revenue dashboard.
- Clinic revenue is the only revenue that appears in the clinic billing dashboard.
- Future payout tables should reference the settled payment or financial snapshot, but must not redefine transaction ownership.
