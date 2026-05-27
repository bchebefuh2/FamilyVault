# 🔐 FamilyVault

A secure, private cloud storage platform for families. Full-stack portfolio project built with enterprise-grade tools.

| Layer | Technology |
|---|---|
| Backend API | Java 17 · Spring Boot 3 · Spring Security 6 · JWT |
| Mobile App | React Native · Expo · TypeScript · Biometric Auth |
| Database | PostgreSQL 16 · Spring Data JPA · Flyway |
| Caching | Redis 7 |
| Cloud (Phase 4) | AWS S3 · RDS · ElastiCache · KMS · CloudFront |
| DevOps | Docker · GitHub Actions CI/CD · AWS ECR · Terraform |

---

## Repository Structure

```
familyvault/
├── familyvault-api/        # Spring Boot backend
├── familyvault-mobile/     # React Native + Expo app
├── .github/
│   └── workflows/
│       ├── ci.yml          # Runs tests on every push/PR
│       └── cd.yml          # Builds + pushes Docker image to ECR on main
├── .devcontainer/
│   └── devcontainer.json   # GitHub Codespaces config
└── Makefile                # Common shortcuts
```

---

## Quick Start

### Option A — GitHub Codespaces (recommended, no installs needed)
1. Click **Code → Codespaces → Create codespace on main**
2. Wait ~2 minutes for setup to finish
3. In the terminal:
```bash
make up    # start Postgres + Redis
make api   # start Spring Boot API
```
Open the forwarded port 8080 → **Swagger UI** auto-opens in your browser.

### Option B — Local (requires Docker + Java 17 + Maven)
```bash
make up    # start Postgres + Redis
make api   # start Spring Boot API
make mobile  # start Expo dev server (separate terminal)
```

---

## CI/CD Pipeline

Every push triggers the pipeline automatically.

```
Push to any branch
       │
       ▼
   CI Pipeline (.github/workflows/ci.yml)
   ├── Run unit + integration tests (JUnit 5 + Mockito)
   ├── Build JAR
   └── Validate Dockerfile builds

Push to main (PR merged)
       │
       ▼
   CD Pipeline (.github/workflows/cd.yml)
   ├── Build production JAR
   ├── Build Docker image
   ├── Push to AWS ECR (tagged with git SHA + latest)
   └── [Phase 4] Deploy to AWS Elastic Beanstalk
```

### GitHub Secrets required for CD
Add these under **Settings → Secrets and variables → Actions**:

| Secret | Description |
|---|---|
| `AWS_ROLE_ARN` | IAM role ARN for GitHub OIDC auth |

*(Phase 4 adds more secrets for RDS, KMS, SES, etc.)*

---

## Project Phases

| Phase | Status | What was built |
|---|---|---|
| 1 | ✅ Complete | Spring Boot API · JWT auth · File endpoints · Docker |
| 2 | ✅ Complete | React Native app · Biometrics · Axios token refresh · SecureStore |
| 3 | ✅ Complete | GitHub Actions CI/CD · Codespaces · Makefile |
| 4 | 🔜 Next | AWS S3 · RDS · ElastiCache · KMS · CloudFront |
| 5 | 🔜 | Terraform IaC · Full cloud deployment |
