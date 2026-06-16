# Phase 9 — Partner Shop & Weekly Settlement

## Business flow

Partner shops such as AC Mobile, BO BO Mobile, The Light, Power 9 and H H Mobile accept customer phones and collect payment from customers. Mahar Shwe performs the repair. Partner shops settle the amount due to Mahar Shwe once per week while keeping their agreed profit.

## Core rules

- Each partner shop remains its own tenant.
- Partner staff can see only their own referrals, balances and settlements.
- Mahar Shwe administrators can see every linked partner shop.
- A repair referral creates a new provider-side repair record and never overwrites the partner's original repair record.
- Customer payment, Mahar Shwe due, partner profit, parts cost and other repair cost are stored as financial snapshots.
- Confirmed settlements are locked. Changes require a new audit event and must not silently rewrite historical figures.
- Customer-paid-at-partner is the default workflow for AC Mobile.

## Database foundation

- `partner_shop_links`: explicit Mahar Shwe ↔ partner tenant relationship and settlement terms
- `partner_repair_ledger`: one financial ledger row per partner repair handoff
- `partner_weekly_settlements`: weekly statement header and locked totals
- `partner_settlement_payments`: cash, KPay, Wave Pay or other settlement payments

## Settlement calculation

```text
Customer Charge
- Parts Cost
- Other Cost
- Mahar Shwe Provider Due
= Partner Profit
```

The provider due may be entered per repair or calculated from a configured default fee. The ledger stores the final snapshot used for settlement.

## Status flow

```text
UNSETTLED → INCLUDED → CONFIRMED → PAID
```

Settlement header flow:

```text
DRAFT → CONFIRMED → PARTIAL → PAID
```

## Phase 9 delivery order

1. Partner shop links and access control
2. Repair handoff ledger
3. Weekly settlement generation
4. Settlement confirmation and locking
5. Payment recording and outstanding balance
6. Partner profit dashboard and CSV export
7. Tenant integrity and audit checks
