# Zest Online Market

This directory is the live runtime and operations workspace for the app.

## Runtime Boundary

- Runtime root: `server/`
- Runtime entrypoint: `server.js`
- Live runtime material: `server/`, `public/`, `storage/`, `fixtures/`
- Operations tooling: `ops/`
- Historical and quarantined material: `reference/`

Nothing in `reference/` is part of the live app.

## Setup

1. Copy `.env.example` to `.env` and set `JWT_SECRET`.
2. Set `APP_ENV` to `local`, `staging`, or `production`.
3. Make sure PostgreSQL is running and that `.env` points to the correct database credentials.
4. Run `npm install` from this directory.
5. Run `npm run db:migrate`.
6. Start the app with `npm start`.

## Runtime Rules

- Live app runtime is PostgreSQL-only.
- Uploads live under `storage/uploads`.
- Legacy SQLite is archived under `reference/sqlite/users.db` and is used only by `ops/db/*`.
- Migration snapshots live under `reference/migration-snapshots`.
- `server/public` is deprecated and not used by the live app.

## Scripts

- `npm start`: boot the live server from the root entrypoint
- `npm run dev`: boot with `nodemon`
- `npm run check:js`: syntax-check live JS files
- `npm run check:repo`: fail on forbidden tracked/runtime artifacts and duplicate migration prefixes
- `npm run check:size`: fail on oversized live JS files outside explicit legacy exceptions
- `npm run test:unit`: run unit tests
- `npm run test:integration`: run integration tests
- `npm test`: run unit and integration tests
- `npm run smoke`: boot the server on a temporary port and verify core runtime flows
- `npm run db:migrate`: run PostgreSQL schema migrations
- `npm run db:rollback`: roll back the latest PostgreSQL migration batch
- `npm run db:seed`: run PostgreSQL seeds
- `npm run db:snapshot`: snapshot the legacy SQLite/archive inputs into `reference/migration-snapshots`
- `npm run db:etl:identity-store`: migrate users, buyers, stores, and store settings into PostgreSQL
- `npm run db:etl:catalog`: migrate catalog items and media into PostgreSQL
- `npm run db:verify`: reconcile PostgreSQL against the archived SQLite source
- `npm run db:buyer`: inspect buyer-domain rows in PostgreSQL

## Live Routes

### Pages

- `/`
- `/marketplace`
- `/feed`
- `/buyer/feed`
- `/buyer/wizard-setup`
- `/stores/:handle`
- `/products/:productId`
- `/auth/signin`
- `/auth/signup`
- `/buyer/profile`
- `/buyer/settings`
- `/buyer/checkout`
- `/buyer/purchases`
- `/seller/store`
- `/seller/store/settings`
- `/seller/store/template`
- `/seller/wizard-setup`
- `/seller/dashboard`
- `/seller/orders`

### APIs

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /api/feed`
- `GET /api/marketplace/stalls`
- `GET /api/buyer/me`
- `GET /api/buyer/feed`
- `GET /api/buyer/following`
- `GET /api/buyer/purchases`
- `POST /api/buyer/following/:handle`
- `DELETE /api/buyer/following/:handle`
- `POST /api/buyer/interactions`
- `GET /api/products`
- `GET /api/products/:productId`
- `POST /api/products`
- `PUT /api/products/:productId`
- `GET /api/store/:handle`
- `GET /api/store/me`
- `POST /api/store`
- `GET /api/feed/store/:handle`
- `GET /api/feed/store/me`
- `POST /api/feed/store-posts`
- `POST /api/engagement/likes/toggle`
- `POST /api/engagement/comments`
- `POST /api/engagement/shares`
- `POST /api/engagement/reactions`

## Reliability Notes

- Browser writes use CSRF protection with the `zest_csrf` cookie plus the `X-CSRF-Token` header.
- Bearer-token API clients remain supported for scripts, smoke checks, and integration tooling.
- Request IDs are attached to responses through `X-Request-Id`.
- Write-rate limiting is PostgreSQL-backed.
- CI runs migrations, tests, repo guards, size guards, and smoke before passing.
