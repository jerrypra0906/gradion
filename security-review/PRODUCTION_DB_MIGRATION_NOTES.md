## Production DB migration (AWS RDS Postgres)

Gradion uses **Prisma Migrate**. In production, the safest way to apply schema changes is:

```bash
npx prisma migrate deploy
```

This will apply any migration folders in `backend/prisma/migrations/` that have not yet been applied to the production database.

### Single SQL bundle (when you need it)

If you must apply changes via SQL (e.g. change-control window), use the generated SQL bundle:

- `security-review/production-db-migrations.sql`

It is a concatenation of all migration SQLs in chronological order.

### How to verify after deploying

1. Confirm Prisma sees DB as up-to-date:

```bash
npx prisma migrate status
```

2. Smoke test key tables/columns exist:
- `parent_logs.aba_session_id`
- `parent_logs.duration_hours`
- `children.assessment_review_status`

### Notes
- Run migrations **once** (single writer) during deploy.
- Ensure your production `DATABASE_URL` points to the **RDS instance** and uses SSL if required.

