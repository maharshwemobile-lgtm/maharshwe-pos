# Phase 12 API

## GET `/api/business-control/overview?date=YYYY-MM-DD`
Returns the authenticated shop's business metrics, account balances, seven-day trend, stock alerts, expenses and closing state.

## POST `/api/business-control/expenses`
Records a business expense, updates the selected money account, and writes an audit record. Requires accounting write access.

## POST `/api/business-control/daily-closing`
Creates one immutable closing snapshot for the authenticated shop and business date. Shop Admin or Super Admin only.
