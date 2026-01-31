# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

```bash
# Build
./gradlew build                              # Full build with tests
./gradlew bootJar                            # Create executable JAR (skip tests with -x test)

# Run locally (requires PostgreSQL and Redis running)
./gradlew bootRun

# Docker (starts app + PostgreSQL + Redis)
docker compose up --build -d
docker compose down -v                       # Stop and remove volumes

# Tests
./gradlew test                               # All unit + integration tests
./gradlew test --tests "*.AuthServiceTest"   # Single test class
./gradlew test --tests "*.AuthServiceTest.login_shouldReturnTokens"  # Single test method
./scripts/functional-test.sh                 # Curl-based API tests against running Docker

# Test report
open build/reports/tests/test/index.html
```

## Architecture

Spring Boot 3.2.2 / Java 17 personal expense management system with PostgreSQL 16 and Redis 7.

### Layer Structure

`controller/` → `service/` → `repository/` → `domain/entity/`

- **Controllers** receive validated request DTOs, delegate to services, return response DTOs
- **Services** contain all business logic, transaction management, and cross-cutting concerns
- **Repositories** extend JpaRepository with custom `@Query` methods for complex searches
- **Entities** use UUID primary keys, `@Version` optimistic locking, and `createdAt`/`updatedAt` audit fields

### Key Design Patterns

- **JWT Authentication**: `JwtTokenProvider` generates tokens → `JwtAuthenticationFilter` intercepts requests → `SecurityConfig` defines public/protected paths. All endpoints except `/api/v1/auth/**`, `/api/health`, and Swagger paths require Bearer tokens.
- **Double-Entry Accounting**: Transfers create two linked `Transaction` records (TRANSFER_IN/TRANSFER_OUT) with corresponding `LedgerEntry` records and a shared `transferLinkId`.
- **Event Sourcing**: All transaction mutations emit `DomainEvent` records for audit trail.
- **Auto-Categorization**: `CategoryService.resolveCategory()` matches merchant names against `CategoryMapping` rules using pattern types (EXACT, CONTAINS, STARTS_WITH, REGEX), ordered by priority.
- **CSV Import Deduplication**: `ImportService` generates SHA-256 hashes from transaction fields; `importHash` column prevents duplicate imports.
- **Reconciliation**: `ReconciliationService` scores imported vs manual transactions using weighted criteria (amount 0.5, date 0.3, merchant 0.2).

### DTOs

All DTOs are Java 17 `record` types in `dto/request/` and `dto/response/`. Request DTOs use Jakarta validation annotations.

### Database Migrations

Flyway migrations live in `src/main/resources/db/migration/`. The initial schema (`V1`) seeds 41 system categories (10 parent + 31 children with hardcoded UUIDs). New migrations must follow the `V{n}__description.sql` naming convention.

**Note**: Tests use H2 in-memory with `create-drop` DDL (Flyway disabled) via `application-test.yml`.

### JPQL Nullable Parameter Pattern

For optional filter parameters in PostgreSQL JPQL queries, use:
```java
AND (CAST(:param AS text) IS NULL OR t.field = :param)
```
Plain `:param IS NULL` causes type mismatch errors with UUID/BigDecimal parameters on PostgreSQL.

## Testing

- **Unit tests** (`src/test/java/.../service/`): Mockito-based, test service logic in isolation
- **Integration tests** (`src/test/java/.../integration/`): `@SpringBootTest` with `@AutoConfigureMockMvc`, use H2 database, test full request/response lifecycle with ordered test methods (`@TestMethodOrder`)
- **Functional tests** (`scripts/functional-test.sh`): Run against live Docker containers, cover all 15 API capabilities

## Docker

Multi-stage Dockerfile: `eclipse-temurin:17-jdk` (build) → `eclipse-temurin:17-jre` (runtime). Uses non-alpine images for ARM64 (Apple Silicon) compatibility. App runs as non-root user `appuser:1001`.

## API Base Paths

All REST endpoints are under `/api/v1/` (auth, accounts, transactions, categories, import, reconciliation, reports). Swagger UI at `/swagger-ui/index.html`. Health check at `/api/health`.

## Frontend

React 18 + TypeScript 5 + Vite 5 single-page application in the `frontend/` directory.

### Frontend Commands

```bash
cd frontend

# Install dependencies
npm install

# Dev server (port 3000, proxies /api to localhost:8080)
npm run dev

# Production build
npm run build

# E2E tests (requires running backend)
npx playwright install --with-deps chromium
npm run test:e2e

# Lint
npm run lint
```

### Frontend Architecture

Route-based micro-frontend composition using `React.lazy()` for code splitting.

**Tech stack**: React 18, TypeScript 5, Vite 5, TailwindCSS 3, React Router 6, @tanstack/react-query 5, react-hook-form + zod, recharts, Axios.

**Directory structure**:
```
frontend/src/
├── App.tsx                    # Shell with lazy-loaded routes
├── main.tsx                   # Entry point (React, Router, QueryClient, AuthProvider)
├── shared/
│   ├── api/client.ts         # Axios instance with Bearer token + 401 refresh
│   ├── auth/                 # AuthContext, AuthProvider (localStorage), AuthGuard
│   ├── layout/               # AppLayout (sidebar + header + content)
│   ├── components/           # DataTable, FormField, Modal, LoadingSpinner, etc.
│   └── types/api.ts          # TypeScript interfaces for all backend DTOs
└── features/
    ├── auth/pages/           # LoginPage, RegisterPage
    ├── dashboard/pages/      # DashboardPage (net worth, cash flow, pie chart)
    ├── accounts/pages/       # AccountListPage, CreateAccountPage, AccountDetailPage
    ├── transactions/pages/   # TransactionListPage, CreateTransactionPage, TransferPage
    ├── categories/pages/     # CategoryTreePage, CategoryMappingsPage
    ├── import/pages/         # ImportPage (CSV upload), ImportJobDetailPage
    ├── reconciliation/pages/ # ReconciliationPage (side-by-side candidates)
    └── reports/pages/        # ReportsPage (charts)
```

### Frontend Docker

Multi-stage Dockerfile: `node:20-alpine` (build) → `nginx:1.25-alpine` (serve). nginx proxies `/api/` to backend `app:8080` and serves SPA with fallback. Frontend runs on port 3000 in docker-compose.
