# Database Cleanup Checklist

- [ ] `users.db` snapshot archived before ETL
- [ ] `storage/uploads` snapshot archived before ETL
- [ ] `fixtures/marketplace-stalls.js` snapshot archived before ETL
- [ ] `DB_PROVIDER` and PostgreSQL connection details defined in environment
- [ ] `server/node_modules`, uploads, and DB files ignored going forward
- [ ] Migration audit tables created
- [ ] Identity/store ETL completed and verified
- [ ] Catalog/media ETL completed and verified
- [ ] Demo data remains fixture/seed only
- [ ] End-to-end runtime checks pass before cutover
- [ ] SQLite archived after PostgreSQL cutover is stable
