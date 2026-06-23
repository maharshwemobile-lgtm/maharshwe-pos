# MaharShwe POS – Full Autonomous Agent Flow (v1)

## 🤖 Overview
This document defines the **fully autonomous execution loop** for the POS system agent. The goal is to allow safe self-healing development while preventing production damage.

---

## 🔁 Main Agent Loop

### STEP 1: SYSTEM SCAN
- Check backend logs (PM2)
- Check frontend build status (Vite)
- Check database constraint errors
- Check API health endpoints

Output:
- List of active errors
- Severity ranking

---

### STEP 2: CLASSIFY ISSUE

#### A. CRITICAL (must fix first)
- DB constraint violations
- API crash / 500 errors
- Prisma runtime errors

#### B. HIGH
- Build failures (Vite / React import issues)
- Missing modules / schema mismatch

#### C. MEDIUM
- UI misalignment
- Missing optional features

---

### STEP 3: ISOLATE ROOT CAUSE

Rules:
- Do NOT patch multiple systems at once
- Identify exact file + function causing issue
- Trace DB → API → UI chain

---

### STEP 4: APPLY FIX (SINGLE CHANGE RULE)

Allowed actions:
- 1 DB fix OR
- 1 API fix OR
- 1 UI fix OR
- 1 schema migration

Forbidden:
- Mixing UI + DB in same commit
- Multiple feature changes

---

### STEP 5: VALIDATION

Run checks:
- npm run build
- API restart (PM2)
- Basic endpoint test (/api/health or /api/auth/me)

If failure:
→ rollback change
→ log error

---

### STEP 6: SAFE DEPLOY GATE

Only deploy if:
- No PM2 crash loop
- No DB constraint errors
- Frontend build passes

---

## 💳 Payment System Rules (STRICT)

Allowed payment types:
- CASH
- KPAY
- BANK
- CREDIT

Rules:
- Must behave like ENUM
- No duplicates allowed
- Soft delete only
- Rename allowed
- Hide allowed

---

## 🧱 Database Safety Rules

- Never drop production tables
- Never run destructive SQL without backup
- All migrations must be reversible

---

## 🔄 Transaction Safety

All POS operations must be:
- Atomic (single transaction)
- Rollback-safe

Flow:
Product → Stock → Sale → Payment → Ledger → History → Report

---

## 🧠 UI RULES

- No floating or disconnected UI
- No refresh buttons anywhere
- Add Category button must NOT break layout
- Consistent layout across pages

---

## 🚀 AUTONOMOUS BEHAVIOR

Agent is allowed to:
- Fix code automatically
- Clean duplicates
- Refactor safely

Agent is NOT allowed to:
- Change business logic without validation
- Deploy without passing checks
- Modify multiple domains at once

---

## 🧭 RECOVERY MODE

If system enters failure loop:
1. Stop PM2 process
2. Revert last commit
3. Rebuild frontend
4. Restart API

---

## 📌 FINAL GOAL
A stable, production-safe POS system that can self-heal without breaking business flow.