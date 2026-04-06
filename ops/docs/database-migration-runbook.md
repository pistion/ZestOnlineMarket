# Database Migration Runbook

## Goals
- Freeze the legacy SQLite runtime before any ETL work.
- Migrate identity/store first, then catalog/media, then verify against PostgreSQL runtime.
- Preserve current public HTTP behavior while persistence moves to PostgreSQL.

## Steps
1. Run `npm run db:snapshot` to archive `reference/sqlite/users.db`, `storage/uploads`, and demo fixtures.
2. Start PostgreSQL with `docker compose up -d postgres` or provide `DATABASE_URL`.
3. Install dependencies with `npm install` so `pg` and `knex` are available.
4. Run `npm run db:migrate`.
5. Run `npm run db:etl:identity-store`.
6. Run `npm run db:verify`.
7. Run `npm run db:etl:catalog`.
8. Run `npm run db:verify`.
9. Re-run smoke tests plus manual store/product checks.
10. Cut over only after reconciliation and end-to-end verification pass.

## Rollback
- Keep the SQLite snapshot and `reference/sqlite/users.db` untouched.
- Do not delete PostgreSQL data until reconciliation is complete.
