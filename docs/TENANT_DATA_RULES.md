# Tenant Data Rules

- The authenticated PostgreSQL user determines the tenant.
- API clients cannot choose a different shop ID.
- Sale History reads and writes are scoped to the current shop.
- Cashier, customer, sale item and payment relations must belong to the same shop.
- User records are soft-deactivated to preserve historical sales.
- The tenant integrity endpoint must report zero violations before deployment.
