# CLAUDE.md — GuardOn 프로젝트 지침

## 서비스 UI 언어 규칙 (CRITICAL)
서비스 전체 UI는 반드시 **한글**. 사용자에게 노출되는 모든 텍스트는 한글 사용. 영문 placeholder 금지.
존댓말(formal Korean) 사용. 모든 사용자 대면 문자열은 `src/lib/constants.ts`에 관리.

## Project Overview
GuardOn은 경비·보안 인력 시장(6,005개 업체, 21.8만 명)에서 업체 간 인력 공유 B2B 레이어를 구축하는 통합 플랫폼.
**핵심 가치:** SOS 긴급 매칭 — 당일 결원을 전화 없이 8분 안에 해결.

## Tech Stack (Locked — do not change)
- Next.js 14 App Router (NOT Pages Router, NOT Next 15)
- TypeScript strict mode
- Tailwind CSS v4
- Prisma + PostgreSQL + PostGIS
- next-auth@beta (v5) — NOT v4
- shadcn/ui (neutral base, CSS variables)
- Pretendard font via @fontsource/pretendard
- Lucide React icons

## Environment (CRITICAL)
- **Docker is NOT available on this machine.** Use local PostgreSQL (pg 17.9 + PostGIS 3.6.2 via Homebrew).
- Database: `guardon` on `localhost:5432`
- Create DB: `psql -d postgres -c "CREATE DATABASE guardon;"`
- Enable PostGIS: `psql -d guardon -c "CREATE EXTENSION IF NOT EXISTS postgis;"`

## Critical Conventions
1. **Prisma singleton**: Always import `prisma` from `@/lib/prisma`. Never `new PrismaClient()` outside that file (HMR causes pool exhaustion).
2. **PostGIS queries**: Use `prisma.$queryRaw` with tagged template literals. The `location` field is `Unsupported("geography(Point,4326)")` — Prisma cannot query it with the normal API.
3. **Korean UI copy**: All user-facing strings live in `src/lib/constants.ts`. Use 존댓말 (formal Korean) consistently. No English placeholders in production UI.
4. **Colors**: Only `brand` (#2563EB) and `sos` (#DC2626) custom tokens. `sos` is reserved for SOS CTA + destructive actions. No dark mode (`dark:` variants forbidden).
5. **Route groups**: `(company)`, `(worker)`, `(admin)`, `(auth)` isolate role layouts. Do NOT create URL-namespaced folders like `/company/sos`.
6. **Security headers**: Already applied globally in `next.config.ts`. Do not remove.
7. **Soft delete**: `User.deletedAt` enables PIPA compliance. Filter `deletedAt IS NULL` in all user queries.

## Skills Directory
`skills/` contains production-ready reference implementations. Read the relevant `SKILL.md` before implementing anything in that domain:
- guardon-project-setup — project scaffolding
- guardon-db-schema — full Prisma schema
- guardon-auth — NextAuth v5 + Kakao
- guardon-sos-engine — SOS matching logic
- guardon-kakao — 알림톡 + SMS fallback
- guardon-admin — admin dashboard
- guardon-ui-components — shared UI components

## Planning Workflow
All phase work lives in `.planning/phases/XX-name/`. Read `ROADMAP.md`, `REQUIREMENTS.md`, `STATE.md` before starting. Follow the GSD workflow — do not skip CONTEXT/RESEARCH/PLAN stages.

## Build & Test
- `npm run dev` — local dev server
- `npm run build` — production build (run after every task)
- `npx prisma generate` — regenerate client after schema changes
- `npx prisma migrate dev` — apply schema changes to DB

## Anti-Patterns (Do NOT)
- Do not install `next-auth@latest` (that's v4). Use `next-auth@beta`.
- Do not re-run `npx shadcn@latest init` (overwrites components.json).
- Do not add `dark:` Tailwind variants (UI-SPEC forbids dark mode in MVP).
- Do not hand-roll PostGIS distance calculations in JS — use `ST_DWithin` with GIST index.
- Do not commit `.env` or `.env.local` — both are gitignored.
- Do not use English UI text — all user-facing copy must be Korean (존댓말).
