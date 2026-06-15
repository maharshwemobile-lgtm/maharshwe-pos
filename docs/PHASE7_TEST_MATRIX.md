# Phase 7 Test Matrix

- Mahar Shwe tenant imports an existing Repair ID without re-entering details.
- A partner tenant generates a unique local Repair ID.
- A partner local job links to a Mahar Shwe Repair ID and syncs status.
- Duplicate provider Repair IDs are rejected inside the same tenant.
- IMEI or serial history returns all matching tenant repairs.
- Status updates append timeline and audit events.
- Referral codes can be created and claimed once.
- Tenant integrity remains safe with zero repair graph violations.
