# Repair Platform Deployment Checklist

1. Configure the existing Mahar Shwe Repair Tracking web-app URL.
2. Confirm each shop uses one existing prefix: `MS`, `AC`, `HH`, `MH`, `PO`, `BO`, `TL` or `P`.
3. Run Prisma migration deployment.
4. Run server syntax checks and frontend build.
5. Create a local repair and confirm a simple ID such as `MS0001` or `AC0001`.
6. Import a known Mahar Shwe Repair ID without re-entering customer/device details.
7. Link Mahar Shwe API data to a partner-shop job and confirm the visible local Repair ID does not change.
8. Link an IMEI or Serial and verify device history.
9. Confirm tenant integrity reports zero violations.
