# PR-23 Deployment Checklist

1. Back up PostgreSQL.
2. Install dependencies and generate Prisma Client.
3. Run `npm run db:deploy`.
4. Run `npm run build`.
5. Deploy `dist/` to the web root.
6. Restart the API process.
7. Configure the Google Sheet Web App URL and matching sync secret.
8. Verify health, remittance create/history, expense categories, and sync status.

Do not run the production seed command.
