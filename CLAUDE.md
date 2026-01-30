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
