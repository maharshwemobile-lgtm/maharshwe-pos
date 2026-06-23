# MaharShwe POS – Agent Execution Plan (v1)

## 🧠 Goal
Stabilize POS system while safely introducing new features without breaking production.

---

## ⚠️ Current System Issues

### 1. Database Integrity
- users_role_shop_scope_check violation
- Missing tables (e.g. user_push_tokens)
- Duplicate payment methods (CASH, KPAY, etc.)

### 2. Payment Method System
Required final structure:
- CASH
- KPAY
- BANK
- CREDIT

Rules:
- No duplicates allowed
- Must behave like ENUM system
- UI must not allow repeated inserts

### 3. Frontend Build Issue
- AppFull.jsx export mismatch
- AppSecure.jsx import failure

---

## 🧩 UI Rules

- Add Category button must NOT break layout
- No floating UI components
- No page refresh button anywhere
- UI must be consistent across all pages

---

## 🔄 System Flow (Target Architecture)

Product → Stock → POS Sale → Payment → Account Ledger → Sale History → Report

All transactions MUST be atomic.

---

## 💳 Payment System Rules

Payment Types:
- CASH
- KPAY
- BANK
- CREDIT

Features:
- Rename
- Hide
- Delete (soft delete preferred)

---

## 🧱 Development Rules (Agent Mode)

- One feature = one commit
- No mixed UI + DB changes
- No production direct schema edits
- Always test locally before deploy

---

## 🚀 Next Safe Steps

1. Fix DB constraint errors
2. Deduplicate payment methods
3. Fix AppFull.jsx export issue
4. Stabilize POS checkout flow
5. Cleanup UI (Category + Payment screens)

---

## 🧭 Notes
This repo is moving toward a full POS ERP system. Stability first, features second.
