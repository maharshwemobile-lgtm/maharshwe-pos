# Hotfix: Role, Permission, Daily Closing and Other Income

## Daily Closing

- Profit and loss columns may be negative.
- Revenue, balances, expenses, receivables and payables remain non-negative.
- The legacy `daily_closings_amounts_nonnegative_check` constraint is rebuilt accordingly.
- Daily Closing stores Other Income in `other_income_total`.

## Other Income

- New PostgreSQL table: `business_other_income`.
- Fields: date, source, amount, method, money account, note and creator.
- Saving Other Income increases the selected account balance.
- Other Income contributes to Today Total Income and Today Profit/Loss.
- Closed business days cannot receive new Other Income or Expense transactions.

## User Access

- Role, tab visibility and function permissions refresh in the active browser session.
- Password reset is handled by the tenant user access API.
- Shop Admin Settings tab is required and cannot be hidden.
