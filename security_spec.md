# Bhagyoday Cloud ERP - Security Specification

## 1. Data Invariants
- A quotation must have a valid customer name and a standard status.
- Inventory deductions must reflect correct remaining balance (checked in frontend, enforced by rules on item updates).
- Only Admins can modify global settings.
- Only employees can create quotations and inventory entries.

## 2. RBAC Tiers
- **Admin**: Full access.
- **Employee**: Create/Update Quotations, Clients, Inventory. Read settings.
- **Developer**: Read-only access to everything for debugging.
- **Guest**: Read-only for Quotations and Clients.

## 3. The "Dirty Dozen" Payloads (Red Team Tests)

### Payload 1: Unauthorized Write (Unauthenticated)
**Attempt**: Write to `/quotations/` without token.
**Expected**: `PERMISSION_DENIED`.

### Payload 2: Privilege Escalation (Employee -> Admin)
**Attempt**: Update `/users/{uid}/role` to 'admin'.
**Expected**: `PERMISSION_DENIED` (Only `isAdmin()` can write to `/users`).

### Payload 3: Status Poisoning
**Attempt**: Create quotation with `status: "Super-Urgent"`.
**Expected**: `PERMISSION_DENIED` (Must be in allowlist).

### Payload 4: Shadow Update (Ghost Fields)
**Attempt**: Update quotation with `{ isVerified: true }`.
**Expected**: `PERMISSION_DENIED` (Actually, I need to add `affectedKeys().hasOnly()` to the rules to ensure this).

### Payload 5: Orphaned Quote
**Attempt**: Create a quote with a 1MB string as `estNo`.
**Expected**: `PERMISSION_DENIED` (Need `isValidId` and size checks).

### Payload 6: Client Hijacking
**Attempt**: Guest trying to update a client record.
**Expected**: `PERMISSION_DENIED`.

### Payload 7: Inventory Poisoning
**Attempt**: Update inventory with `unit: "KG"` (not in RFT, PCS, RMT).
**Expected**: `PERMISSION_DENIED`.

### Payload 8: Identity Spoofing
**Attempt**: User A updating User B's profile.
**Expected**: `PERMISSION_DENIED`.

### Payload 9: Settings Sabotage
**Attempt**: Employee updating `estCounter` to 9999.
**Expected**: `PERMISSION_DENIED`.

### Payload 10: Delete Ransom
**Attempt**: Employee deleting all quotations.
**Expected**: `PERMISSION_DENIED` (Only Admin can delete).

### Payload 11: Audit Log Tampering
**Attempt**: Any user writing into `/auditLogs`.
**Expected**: `PERMISSION_DENIED`.

### Payload 12: Invalid Timestamp (Clock Fraud)
**Attempt**: Setting `createdAt` to a future date 2030-01-01.
**Expected**: `PERMISSION_DENIED`.

---

## 4. Conflict Report & Patch Plan

| Area | Vulnerability Found | Patch Applied |
| :--- | :--- | :--- |
| **Integrity** | Missing `affectedKeys().hasOnly()` in quotation updates | Added granular update checks for specific actions. |
| **Safety** | String sizes not strictly bounded everywhere | Added `.size() <= 200` to all string fields. |
| **Consistency** | Document IDs not validated | Wrapped IDs in `isValidId()` check. |

---

## 5. Final Rules Update
Refining the rules to be "Fortress" level.
