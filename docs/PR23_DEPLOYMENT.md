# PR-23 Deployment Checklist

1. Back up PostgreSQL.
2. Install dependencies and generate Prisma Client.
3. Run `npm run db:deploy`.
4. Run `npm run build`.
5. Deploy `dist/` to the web root.
6. Restart the API process.
7. Open **Project Settings → Payments, Categories & Integrations** as Shop Admin.
8. Add or restore wallets in the single Payment Types master list.
9. Enable **Use in Money Service** only for wallets accepted by Money Service, then set their Transfer/Cash Out fees.
10. Configure Google Apps Script Web App POST/GET URLs and Shared Secret in Project Settings, then run Test POST and Test GET.
11. Replace and redeploy `integrations/google-apps-script/MaharShwePosSync.gs` when using the five-minute backup sync.
12. Verify Sale POS payment choices, Money Service wallet/fee choices, Accounts balances, Income/Expense category selectors, live sheet events and backup exports.

Google Sheet webhook URL and secret do not need to be configured in the VPS `.env`; legacy environment webhook values are ignored by the PR-23 V5 entrypoint.

Do not run the production seed command.
