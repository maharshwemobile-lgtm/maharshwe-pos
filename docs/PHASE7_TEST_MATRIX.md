# Phase 7 Test Matrix

- Mahar Shwe tenant imports an existing `MS` Repair ID without re-entering details.
- A partner tenant generates the next simple prefix ID, for example `AC0001`.
- No generated ID contains shop code, year, month or multiple public identifiers.
- A partner local job links internally to a Mahar Shwe Repair ID and keeps its original visible ID.
- Duplicate provider Repair IDs are rejected inside the same tenant.
- IMEI or Serial history returns all matching tenant repairs.
- Status updates append timeline and audit events.
- Tenant integrity remains safe with zero repair graph violations.
