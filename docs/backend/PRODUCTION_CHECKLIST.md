<!-- path: docs/PRODUCTION_CHECKLIST.md -->
# DriveCare V2 — Production Readiness Checklist

Use this checklist for staging/prod releases. Keep it in Git and update per release. Everything here is lightweight and focused on core/infra, no business logic.

Meta
- [ ] Release ID/Tag: __________
- [ ] Environment: Staging / Production
- [ ] Date: __________
- [ ] Prepared by: __________
- [ ] Rollback image/tag: __________
- [ ] DB backup snapshot ID: __________

1) Configuration & Secrets (required)
- One source of truth for DB config:
  - [ ] Use DATABASE_URL OR POSTGRES_* (not both). If both present, confirm which one your runtime actually uses (CLI prioritizes DATABASE_URL).
- Required secrets (prod/staging):
  - [ ] JWT_SECRET (min 32 bytes)
  - [ ] JWT_REFRESH_SECRET (min 32 bytes)
  - [ ] RT_PEPPER (min 16–32 bytes)
  - [ ] RT_HMAC_SECRET (min 32–48 bytes)
  - [ ] PWD_PEPPER (min 32–48 bytes)
  - [ ] DEVICE_ID_SECRET (min 32 bytes)
  - [ ] COOKIE_SECRET (min 16–32 bytes)
  - [ ] AUDIT_CHAIN_KEY (min 32–48 bytes)
  - [ ] DATABASE_URL (or POSTGRES_*)
  - [ ] REDIS_URL (or REDIS_* host/port/pass)
  - [ ] CORS_ORIGINS (exact FE domains)
  - [ ] PRIVACY_POLICY_TEXT_HASH (required in production)
- Generation commands (run locally and paste values):
  - JWT_SECRET: openssl rand -base64 48
  - JWT_REFRESH_SECRET: openssl rand -base64 64
  - RT_PEPPER: openssl rand -base64 32
  - RT_HMAC_SECRET: openssl rand -base64 48
  - PWD_PEPPER: openssl rand -base64 48
  - DEVICE_ID_SECRET: openssl rand -base64 32
  - COOKIE_SECRET: openssl rand -base64 32
  - AUDIT_CHAIN_KEY: openssl rand -base64 48
  - PM_ENC_KEY (AES-256-GCM, 32 bytes base64): openssl rand -base64 32
  - PRIVACY_POLICY_TEXT_HASH: echo -n "<paste policy text>" | shasum -a 256 | awk '{print $1}'

2) Database & Migrations
- [ ] synchronize=false in all envs (runtime)
- [ ] Seeds do NOT rely on synchronize in staging/prod
- [ ] Init migration committed and up to date (src/database/migrations/**/*)
- [ ] Apply migrations before app start:
  - staging/prod: npm run migration:run (or CI step)
- [ ] Rollback plan prepared:
  - npm run migration:revert (and deploy previous image)
- [ ] Pre-release backup taken (dump/snapshot ID recorded above)

3) Seeds (safety)
- [ ] Dev: SEEDS_ENABLED=true, DB_AUTO_SYNC_ON_SEEDS=true
- [ ] Staging: SEEDS_ENABLED=false (or true only under explicit ALLOW_STAGING_SEEDS=true for controlled runs)
- [ ] Production: SEEDS_ENABLED=false, DB_AUTO_SYNC_ON_SEEDS=false

4) Security & HTTP
- Cookies:
  - [ ] HttpOnly + Secure enabled (runtime)
  - [ ] sameSite=lax (or none if cross-site with https)
  - [ ] COOKIE_SECRET set
- CORS:
  - [ ] Origins restricted to FE domains only
  - [ ] credentials=true only if needed by FE
- Headers:
  - [ ] helmet HSTS enabled in production
  - [ ] CSP OK (no unsafe in prod)
  - [ ] X-Powered-By disabled
  - [ ] trust proxy set (if behind proxy)
- Swagger:
  - [ ] Disabled in prod (code already does this)
- Rate limiting:
  - [ ] Global throttling active (ThrottlerModule)
- Webhooks:
  - [ ] Raw-body route set for YooKassa/Tinkoff
  - [ ] Paths: YOOKASSA_WEBHOOK_PATH / TINKOFF_WEBHOOK_PATH
  - [ ] Signature validation covered at handler level (out of scope here)
- Shutdown:
  - [ ] No duplicate shutdown hooks (app.enableShutdownHooks() disabled, custom SIGINT/SIGTERM handlers active)

5) Observability & Health
- [ ] /health returns 200
- [ ] Basic JSON logs (stdout) OK
- Optional (prod-hardened):
  - [ ] Sentry DSN configured (SENTRY_DSN)
  - [ ] Readiness endpoint (if using orchestrator probes)
  - [ ] Request ID propagation (X-Request-ID)

6) CI/CD flow (Prod-lite)
- [ ] Build image
- [ ] Run DB migrations (migration:run) using env secrets
- [ ] Start service (same tag)
- [ ] Smoke tests (see section 7)
- [ ] Rollback command tested (previous image + migration:revert if needed)

7) Smoke tests (minimal)
- [ ] GET /api/v1/health → 200
- [ ] POST /api/v1/auth/login (superadmin) → 200 + JWT + RT cookie
- [ ] GET guarded endpoint without token → 401/403
- [ ] GET Swagger (staging only) → available
- Optional:
  - [ ] Webhook endpoints accept raw body (HTTP 2xx)

8) Compliance snapshot (RU)
- 152‑ФЗ (PD):
  - [ ] Privacy Policy text/version aligned with deployed PRIVACY_POLICY_VERSION/HASH
  - [ ] Subject rights endpoints available (export/revoke/anonymize where applicable)
  - [ ] Retention CRONs active for PII modules (e.g., Customers)
- 242‑ФЗ:
  - [ ] Data localization confirmed (DB/backups in RU)
- 54‑ФЗ/161‑ФЗ (if applicable now):
  - [ ] Fiscalization provider set (if needed)
  - [ ] Payment→Receipt linkage (can be deferred if not charging yet)

9) Risk & Exceptions (fill in)
- Known deviations for this release:
  - [ ] __________
- Mitigations/owner:
  - [ ] __________

10) Runbook (quick commands)
- Migrations:
  - Generate init: npm run migration:generate:init
  - Run: npm run migration:run
  - Revert: npm run migration:revert
  - Drop (dev only): npm run migration:drop
- App:
  - Start (dev): npm run start:dev
  - Build: npm run build
  - Start (prod): npm run start:prod
- Smoke:
  - scripts/smoke.sh (BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD)

11) Staging/Production .env keys (must have)
- Core:
  - [ ] NODE_ENV=staging|production
  - [ ] API_PREFIX=api/v1
  - [ ] DATABASE_URL (or POSTGRES_*)
  - [ ] REDIS_URL
- Auth/Security:
  - [ ] JWT_SECRET, JWT_REFRESH_SECRET
  - [ ] RT_PEPPER, RT_HMAC_SECRET
  - [ ] PWD_PEPPER, DEVICE_ID_SECRET
  - [ ] COOKIE_SECRET
  - [ ] CORS_ORIGINS
- Privacy/Compliance:
  - [ ] PRIVACY_POLICY_VERSION
  - [ ] PRIVACY_POLICY_TEXT_HASH (prod required)
  - [ ] AUDIT_CHAIN_KEY
- Webhooks:
  - [ ] YOOKASSA_WEBHOOK_PATH, TINKOFF_WEBHOOK_PATH
- Seeds:
  - [ ] SEEDS_ENABLED=false
  - [ ] DB_AUTO_SYNC_ON_SEEDS=false
  - [ ] ALLOW_STAGING_SEEDS=false

12) Post-release tasks
- [ ] Rotate temporary superadmin password; store in password manager
- [ ] Verify audit logging in DB (if enabled) without PII leakage
- [ ] Verify no .env or secrets in image/artifacts (check docker history / CI logs)
- [ ] Capture release notes and update MASTER MODULE TABLE status

Appendix — Gotchas
- If DATABASE_URL and POSTGRES_* both defined, runtime/CLI uses DATABASE_URL.
- For dev, it’s OK to keep secrets in .env; ensure .env is ignored (already in .gitignore).
- Ensure Postgres binds to localhost in dev (no public exposure).
- Swagger is auto-disabled in production code; do not re-enable publicly.

Sign-off
- Tech Lead: __________ Date: __________
- Security/Compliance (if applicable): __________ Date: __________
