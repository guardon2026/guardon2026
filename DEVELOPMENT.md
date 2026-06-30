# Development Setup — GuardOn

## Prerequisites
- Node.js 18+ (verified working with 25.6.1)
- PostgreSQL 15+ with PostGIS 3+ (verified: pg 17.9 + PostGIS 3.6.2 via Homebrew)
- **Docker is NOT required and NOT used.** Connect to local PostgreSQL directly.

## One-Time Setup

### 1. Clone and install
```bash
git clone <repo-url> guardon
cd guardon
npm install
```

### 2. Create the database
```bash
psql -h localhost -p 5432 -d postgres -c "CREATE DATABASE guardon;"
psql -h localhost -p 5432 -d guardon -c "CREATE EXTENSION IF NOT EXISTS postgis;"
psql -h localhost -p 5432 -d guardon -c "SELECT postgis_version();"
```

### 3. Environment variables
```bash
cp .env.example .env.local
cp .env.example .env   # Prisma CLI reads .env
```
Fill in at minimum `DATABASE_URL` (point to local `guardon` DB). Other keys (Kakao, SOLAPI, AWS) can stay empty until the phase that needs them.

Generate `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 4. Apply migrations
```bash
npx prisma migrate deploy   # preferred
# If non-interactive, fallback:
npx prisma db push --accept-data-loss
psql -d guardon -f prisma/migrations/0002_postgis_indexes/migration.sql
npx prisma generate
```

### 5. Run dev server
```bash
npm run dev
# visit http://localhost:3000
# visit http://localhost:3000/design-preview for component gallery
```

## Daily workflow
- `npm run dev` — dev server (HMR)
- `npm run build` — verify production build before commit
- `npx prisma studio` — DB inspection UI

## Verify security headers
```bash
curl -sI http://localhost:3000 | grep -iE "x-frame|x-content|strict-transport|content-security|referrer|permissions"
```
Should return all 6 headers.

## Troubleshooting
- **PostGIS extension missing**: Re-run step 2.
- **Prisma HMR pool exhaustion**: restart dev server; never `new PrismaClient()` outside `src/lib/prisma.ts`.
- **CSP blocking dev**: known limitation; dev CSP includes `unsafe-eval` for Next.js HMR.

## External Service Setup (per phase)
| Phase | Service | Action |
|-------|---------|--------|
| 2 | Kakao Developers | Register app, get CLIENT_ID/SECRET |
| 9 | Kakao 알림톡 | Apply for 비즈니스 채널 (2~4 weeks review) — START ON DAY 1 |
| 9 | SOLAPI | Sign up, verify sender phone |
| 5 | AWS S3 (or local) | Create bucket with server-side encryption |
