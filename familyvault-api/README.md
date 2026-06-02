#  FamilyVault API

A secure, private cloud storage platform for families. Built with **Java 17 / Spring Boot 3**, **Spring Security 6**, **JWT auth**, **PostgreSQL**, and **Redis** — containerized with Docker and ready to deploy to AWS.
           

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend framework | Java 17 · Spring Boot 3.2 |
| Security | Spring Security 6 · JWT (jjwt 0.12) · BCrypt · RBAC |
| Database | PostgreSQL 16 · Spring Data JPA · Hibernate 6 · Flyway |
| Caching / Sessions | Redis 7 · Spring Data Redis |
| API Docs | OpenAPI 3 · Swagger UI (springdoc) |
| File Storage | Local disk (Phase 1) → AWS S3 (Phase 4) |
| Containerization | Docker · Docker Compose |
| CI/CD (Phase 5) | GitHub Actions · AWS ECR · AWS Elastic Beanstalk |
| IaC (Phase 5) | Terraform |
| Testing | JUnit 5 · Mockito · Spring MockMvc |

---

## Architecture Overview

```
React Native App
      │  HTTPS + Bearer JWT
      ▼
Spring Boot API (port 8080)
  ├── Spring Security 6 Filter Chain
  │     └── JwtAuthFilter → validates Bearer token each request
  ├── AuthController    /api/auth/**  (public)
  │     ├── POST /register  → creates family (ADMIN) or joins with invite code (MEMBER)
  │     ├── POST /login     → issues JWT access token + Redis refresh token
  │     ├── POST /refresh   → rotates refresh token, issues new access token
  │     └── POST /logout    → invalidates refresh token in Redis
  └── FileController    /api/files/** (authenticated)
        ├── POST /upload          → saves file, writes metadata to PostgreSQL
        ├── GET  /                → lists all family files
        ├── GET  /{id}/download   → streams file with family isolation check
        └── DELETE /{id}          → soft delete (admin: any file; member: own only)
        
PostgreSQL ── stores Users, Families, FileMetadata, AuditLogs
Redis      ── stores refresh tokens (7-day TTL) + token blacklist
```

---

## Security Design

| Feature | Implementation |
|---|---|
| Password hashing | BCryptPasswordEncoder (strength 10) |
| Access tokens | JWT signed with HMAC-SHA256, 15-min expiry |
| Refresh tokens | Random UUID stored in Redis with 7-day TTL; rotated on every use |
| Role-based access | `ROLE_ADMIN` / `ROLE_MEMBER` enforced via `@PreAuthorize` |
| Family isolation | Every file/download endpoint verifies `user.familyId == file.familyId` |
| Audit trail | Every login, upload, download, and delete is logged to `audit_logs` |
| Invite-only access | New users must have an invite code issued by a family ADMIN |

---

## Quick Start (Local)

### Prerequisites
- Java 17+
- Maven 3.9+
- Docker Desktop

### 1. Start PostgreSQL and Redis
```bash
docker compose up -d postgres redis
```

### 2. Run the API
```bash
./mvnw spring-boot:run
```

The API starts on **http://localhost:8080**

### 3. Open Swagger UI
```
http://localhost:8080/swagger-ui.html
```

---

## API Reference

### Auth Endpoints (public)

```
POST /api/auth/register     Create new family (ADMIN) or join existing (MEMBER)
POST /api/auth/login        Authenticate and receive tokens
POST /api/auth/refresh      Rotate refresh token → new access token
POST /api/auth/logout       Invalidate refresh token
```

**Register as new family admin:**
```json
POST /api/auth/register
{
  "email": "john@example.com",
  "password": "securepass",
  "firstName": "John",
  "lastName": "Smith",
  "familyName": "Smith Family"
}
```

**Response includes `inviteCode` for the admin** — share this with family members.

**Join as member:**
```json
POST /api/auth/register
{
  "email": "jane@example.com",
  "password": "securepass",
  "firstName": "Jane",
  "lastName": "Smith",
  "inviteCode": "ABCD1234"
}
```

### File Endpoints (JWT required)

```
POST   /api/files/upload          multipart/form-data, field: "file"
GET    /api/files                 list all family files
GET    /api/files/{id}/download   stream file
DELETE /api/files/{id}            soft delete
```

---

## Project Phases

| Phase | Status | Description |
|---|---|---|
| 1 | ✅ **Complete** | Spring Boot API · Auth · JWT · File endpoints · Docker |
| 2 | 🔜 | React Native mobile app + biometric auth |
| 3 | 🔜 | Docker Compose local stack + GitHub Actions CI/CD |
| 4 | 🔜 | AWS S3 · RDS · ElastiCache · KMS swap |
| 5 | 🔜 | Terraform IaC · AWS ECR · full cloud deployment |

---

## Running Tests

```bash
./mvnw test
```

Tests use **JUnit 5 + Mockito** (unit) and **Spring MockMvc** (controller integration). No real DB needed — H2 in-memory is used for integration tests.

---

## Environment Variables (Production)

| Variable | Description |
|---|---|
| `SPRING_DATASOURCE_URL` | PostgreSQL JDBC URL |
| `SPRING_DATASOURCE_USERNAME` | DB username |
| `SPRING_DATASOURCE_PASSWORD` | DB password |
| `SPRING_REDIS_HOST` | Redis host |
| `JWT_SECRET` | Base64-encoded 256-bit secret (never commit this) |

> In production, these are managed by **AWS Secrets Manager** — never hardcoded.

Generate a secure JWT secret:
```bash
openssl rand -base64 64
```
