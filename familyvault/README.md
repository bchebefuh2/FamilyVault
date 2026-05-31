# FamilyVault

A secure, private cloud storage platform for families — built as a portfolio project to demonstrate enterprise-grade full-stack development skills.

---

## Tech Stack

| Layer | Technology | Why it matters to employers |
|---|---|---|
| Backend | Java 17 · Spring Boot 3.2 | Industry standard for enterprise Java |
| Security | Spring Security 6 · JWT · BCrypt · RBAC | Every company needs this |
| Database | PostgreSQL 16 · Spring Data JPA · Hibernate · Flyway | ORM + schema migrations |
| Caching | Redis 7 · Spring Data Redis | Session management, performance |
| Mobile | React Native · Expo · TypeScript | Cross-platform iOS + Android |
| Auth (mobile) | Expo SecureStore · Biometrics (Face ID / Fingerprint) | Secure token storage |
| HTTP client | Axios with silent token refresh interceptor | Production API pattern |
| Cloud | AWS S3 · RDS · ElastiCache · KMS · CloudFront · SES | Most in-demand cloud skills |
| IaC | Terraform | Provision infra as code, not clicks |
| Containers | Docker · Docker Compose · AWS ECR | Standard deployment unit |
| CI/CD | GitHub Actions (test → build → push → deploy) | Automates everything |
| API Docs | OpenAPI 3 · Swagger UI | Professional API design |
| Testing | JUnit 5 · Mockito · Spring MockMvc | Unit + integration tests |

---

## Repository Structure

```
familyvault/
├── familyvault-api/            # Spring Boot backend
│   ├── src/main/java/com/familyvault/
│   │   ├── config/             # SecurityConfig, AwsConfig, RedisConfig
│   │   ├── controller/         # AuthController, FileController
│   │   ├── dto/                # Request/response objects
│   │   ├── entity/             # User, Family, FileMetadata, AuditLog
│   │   ├── exception/          # GlobalExceptionHandler, ApiException
│   │   ├── repository/         # JPA repositories
│   │   ├── security/           # JwtUtil, JwtAuthFilter, UserDetailsServiceImpl
│   │   └── service/            # AuthService, FileStorageService, S3FileStorageService
│   ├── src/main/resources/
│   │   ├── application.yml         # Local config
│   │   ├── application-prod.yml    # Production config (reads from Secrets Manager)
│   │   └── db/migration/V1__init.sql  # Flyway schema
│   ├── src/test/               # JUnit 5 + Mockito tests
│   └── Dockerfile
│
├── familyvault-mobile/         # React Native + Expo app
│   ├── src/
│   │   ├── api/                # Axios client + interceptors, authApi, fileApi
│   │   ├── context/            # AuthContext (global auth state + biometrics)
│   │   ├── hooks/              # useFiles (upload, list, delete)
│   │   ├── navigation/         # AppNavigator, AuthStack, MainTabs
│   │   ├── screens/            # Login, Register, Home, Upload, Profile
│   │   ├── storage/            # SecureStore wrapper (iOS Keychain / Android Keystore)
│   │   ├── types/              # TypeScript interfaces
│   │   └── utils/              # File size formatter, date formatter, error extractor
│   └── App.tsx
│
├── infra/                      # Terraform — all AWS resources
│   ├── main.tf                 # Provider config, remote state
│   ├── networking.tf           # VPC, subnets, IGW, NAT Gateway
│   ├── security_groups.tf      # Least-privilege SGs per tier
│   ├── kms.tf                  # Customer-managed encryption key
│   ├── s3.tf                   # File storage bucket
│   ├── cloudfront.tf           # CDN distribution
│   ├── rds_elasticache.tf      # PostgreSQL + Redis
│   ├── secrets_iam.tf          # Secrets Manager + IAM role
│   ├── ecr.tf                  # Container registry
│   ├── elasticbeanstalk.tf     # App hosting + auto-scaling
│   ├── variables.tf
│   └── outputs.tf
│
├── .github/workflows/
│   ├── ci.yml                  # Test + build on every push/PR
│   └── cd.yml                  # Build → ECR → Elastic Beanstalk on main
│
├── .devcontainer/
│   ├── devcontainer.json       # Codespaces configuration
│   └── setup.sh                # Pre-downloads Maven + npm dependencies
│
├── SECRETS.md                  # Every GitHub secret explained
├── Makefile                    # All common commands in one place
└── README.md                   # This file
```

---

## What you need to install

### Codespaces path (recommended — least to install)

| Tool | Where to get it | Why |
|---|---|---|
| Git | [git-scm.com](https://git-scm.com) | Push code to GitHub |
| Expo Go (phone app) | App Store / Google Play | Run the mobile app on your phone |

That's it. Java, Maven, Node, Docker, Postgres, and Redis are all handled inside the Codespace automatically.

---

### Local development path

| Tool | Where to get it | Why |
|---|---|---|
| Docker Desktop | [docker.com/products/docker-desktop](https://docker.com/products/docker-desktop) | Runs Postgres + Redis in containers |
| Java 17 JDK | [adoptium.net](https://adoptium.net) (Temurin) | Runs the Spring Boot API |
| Maven 3.9 | `brew install maven` or [maven.apache.org](https://maven.apache.org) | Builds the Java project |
| Node 20 | [nodejs.org](https://nodejs.org) | Runs the React Native / Expo app |
| Expo Go (phone app) | App Store / Google Play | Run the mobile app on your phone |

> **What the containers already handle:** PostgreSQL and Redis run inside Docker via `docker compose up`. You do not install either of them — Docker Desktop is all you need for those two.

> **What is NOT containerized for local dev:** The Spring Boot API runs directly with Maven (`mvn spring-boot:run`), not in Docker. This makes local development faster since you get hot-reload and direct IDE debugging. The Dockerfile is only used for the production deployment to Elastic Beanstalk.

---

### Production / AWS path (Phases 4 + 5)

| Tool | Where to get it | Why |
|---|---|---|
| AWS CLI v2 | [docs.aws.amazon.com/cli](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) | Interact with AWS from terminal |
| Terraform 1.7+ | `brew install terraform` or [terraform.io](https://developer.hashicorp.com/terraform/install) | Provision all AWS infrastructure |
| An AWS account | [aws.amazon.com](https://aws.amazon.com) | Free tier covers most of Phase 4 testing |

After installing the AWS CLI, configure it:
```bash
aws configure
# Enter your Access Key ID, Secret Access Key, region (us-east-1), output format (json)
```

---

## How to actually see the app

There are two paths: Codespaces (no installs) or local (requires Docker + Maven).

### Path A — GitHub Codespaces (recommended if you have no local tools)

**Step 1 — Push your code to GitHub**
```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/familyvault.git
git push -u origin main
```

**Step 2 — Open a Codespace**
1. Go to your repo on GitHub.com
2. Click the green **Code** button
3. Click **Codespaces** tab → **Create codespace on main**
4. Wait ~2 minutes — the setup script pre-downloads all dependencies automatically

**Step 3 — Start the backend**

Open a terminal in the Codespace and run:
```bash
make up     # starts Postgres + Redis in Docker
make api    # starts the Spring Boot API
```

The Codespace will show a popup: **"Your application running on port 8080 is available"**. Click **Open in Browser** — this opens Swagger UI where you can test every endpoint.

**Step 4 — Test the API in Swagger UI**

You'll see the full interactive API docs at the forwarded URL. Test the full flow:

1. `POST /api/auth/register` — create an account (creates a new family, returns an invite code)
2. Click **Authorize** (top right), paste `Bearer <your accessToken>`
3. `POST /api/files/upload` — upload any file
4. `GET /api/files` — see your file listed
5. `GET /api/files/{id}/download` — download it back

**Step 5 — Run the mobile app**

Open a **second terminal** in the Codespace:
```bash
# Update the API URL to your Codespace URL first (see note below)
make mobile-install
cd familyvault-mobile && npx expo start --tunnel
```

> **Important:** Before running the mobile app, open `familyvault-mobile/src/api/client.ts`
> and replace `http://localhost:8080` with your Codespace's forwarded URL
> (looks like `https://XXXX-8080.app.github.dev`). The `--tunnel` flag is
> required in Codespaces so your phone can reach the dev server.

Install **Expo Go** on your phone (free on App Store / Google Play), scan the QR code, and the app opens. You'll see:
- Login screen with Face ID / Fingerprint button
- Register screen with "Create Family" / "Join Family" toggle
- File browser showing family files
- Upload screen with photo library, camera, and file picker
- Profile screen showing your family name, invite code (admins), and security settings

---

### Path B — Local development

Requirements: Docker Desktop, Java 17, Maven 3.9, Node 20

```bash
# Terminal 1 — infrastructure
make up

# Terminal 2 — backend API
make api

# Terminal 3 — mobile app
make mobile
```

- **Swagger UI:** http://localhost:8080/swagger-ui.html
- **Mobile:** scan the QR code with Expo Go on your phone

---

## Full system architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│                                                                 │
│   React Native App (iOS + Android)                             │
│   ├── Expo SecureStore  → tokens in iOS Keychain / Android KS  │
│   ├── Biometric auth    → Face ID / Fingerprint unlock         │
│   └── Axios client      → auto-refreshes JWT on 401            │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS + Bearer JWT
┌────────────────────────▼────────────────────────────────────────┐
│                       API LAYER (Spring Boot)                   │
│                                                                 │
│   JwtAuthFilter → validates token on every request             │
│   SecurityConfig → stateless sessions, CORS, RBAC              │
│                                                                 │
│   POST /api/auth/register   create family (ADMIN) or join      │
│   POST /api/auth/login      returns JWT + refresh token        │
│   POST /api/auth/refresh    rotates refresh token              │
│   POST /api/auth/logout     invalidates refresh token          │
│                                                                 │
│   POST /api/files/upload    encrypt + store file               │
│   GET  /api/files           list family files                  │
│   GET  /api/files/{id}/download  presigned URL (prod) / stream │
│   DELETE /api/files/{id}    soft delete (RBAC enforced)        │
└──────────┬────────────────────────────┬────────────────────────┘
           │                            │
┌──────────▼──────────┐    ┌────────────▼─────────────────────────┐
│    DATA LAYER        │    │           STORAGE LAYER              │
│                     │    │                                      │
│  PostgreSQL (RDS)   │    │  AWS S3                              │
│  ├── users          │    │  ├── Files encrypted with KMS CMK    │
│  ├── families       │    │  ├── Versioning enabled              │
│  ├── file_metadata  │    │  └── Served via CloudFront CDN       │
│  └── audit_logs     │    │                                      │
│                     │    │  AWS KMS                             │
│  Redis (ElastiCache)│    │  └── Customer-managed encryption key │
│  ├── refresh tokens │    │                                      │
│  └── rate limiting  │    │  AWS Secrets Manager                 │
└─────────────────────┘    │  └── All credentials (no env vars)  │
                           └──────────────────────────────────────┘
```

---

## Request flow — login to file download

```
1. User opens app
       ↓
2. App checks SecureStore for existing tokens
   → Found: restore session silently
   → Not found: show login screen
       ↓
3. User logs in (password or Face ID / Fingerprint)
       ↓
4. POST /api/auth/login
   → Spring Security authenticates via DaoAuthenticationProvider
   → AuthService generates JWT (15-min) + refresh token (UUID, 7-day TTL in Redis)
   → Tokens saved to SecureStore
       ↓
5. User uploads a photo
       ↓
6. Expo ImagePicker selects photo from camera roll
       ↓
7. POST /api/files/upload (multipart, Bearer token in header)
   → JwtAuthFilter validates token, sets SecurityContext
   → FileStorageService (local dev) or S3FileStorageService (prod):
       dev  → saves to disk at uploads/{familyId}/{uuid}_filename
       prod → PutObject to S3 with SSE-KMS encryption
   → FileMetadata saved to PostgreSQL
   → AuditLog entry written asynchronously
       ↓
8. User taps a file to download
       ↓
9. GET /api/files/{id}/download
   → Family isolation check: user.familyId must match file.familyId
   → dev:  streams file bytes back through API
   → prod: returns 15-minute presigned S3 URL → client fetches directly from S3/CloudFront
   → AuditLog entry written
       ↓
10. Access token expires after 15 minutes
        ↓
11. Next API call returns 401
        ↓
12. Axios response interceptor catches 401
    → Calls POST /api/auth/refresh with stored refresh token
    → Spring Boot deletes old token from Redis, issues new access + refresh tokens (rotation)
    → Stores new tokens in SecureStore
    → Replays the original failed request
    → User never sees a login screen
```

---

## CI/CD Pipeline — what happens on every push

```
You push any code to GitHub
          │
          ▼
  ci.yml runs (every branch + every PR)
  ├── Spins up Postgres + Redis as GitHub Actions services
  ├── Runs all JUnit 5 + Mockito tests
  ├── Builds the JAR
  ├── Validates the Dockerfile builds cleanly
  └── Publishes test report to the PR (pass/fail per test)

          │ (only if CI passes AND branch is main)
          ▼
  cd.yml runs
  ├── Builds production JAR (DskipTests — already tested above)
  ├── Authenticates with AWS via OIDC (no access keys stored in GitHub)
  ├── Logs in to ECR
  ├── Builds Docker image (multi-stage: Maven build → JRE runtime)
  ├── Tags image with git SHA + "latest"
  ├── Pushes both tags to ECR
  ├── Creates Dockerrun.aws.json pointing to the new image
  ├── Uploads it to the EB deployments S3 bucket
  ├── Creates a new EB application version
  ├── Deploys to Elastic Beanstalk (rolling deploy — zero downtime)
  ├── Waits for environment to become Ready
  ├── Checks /actuator/health — fails pipeline if unhealthy
  └── Posts deployment summary to the GitHub Actions job page
```

---

## Security design

| Feature | How it works |
|---|---|
| Passwords | BCryptPasswordEncoder (strength 10) — never stored in plain text |
| Access tokens | JWT signed with HMAC-SHA256, 15-minute expiry |
| Refresh tokens | Random UUID, stored in Redis with 7-day TTL — rotated on every use |
| Token storage (mobile) | Expo SecureStore → iOS Keychain / Android Keystore. Never AsyncStorage |
| Biometric auth | expo-local-authentication — Face ID / Fingerprint unlocks the stored session |
| Role-based access | `ROLE_ADMIN` / `ROLE_MEMBER` enforced by `@PreAuthorize` at the method level |
| Family isolation | Every file endpoint verifies `user.familyId == file.familyId` |
| File encryption | AES-256 via AWS SSE-KMS. Each file encrypted with our customer-managed key |
| Secrets management | AWS Secrets Manager — zero credentials in code, env vars, or GitHub secrets |
| AWS auth (CI/CD) | OIDC — GitHub assumes an IAM role. No long-lived access keys anywhere |
| Invite-only access | Users can only join a family with a code issued by an ADMIN |
| Audit trail | Every login, upload, download, and delete logged to the `audit_logs` table |
| Soft deletes | Files are never hard-deleted from the DB — `deleted=true` flag only |

---

## Common issues and fixes

**"Connection refused" when starting the API**
Postgres or Redis aren't running. Run `make up` first, wait 10 seconds, then `make api`.

**Flyway error on startup**
The database doesn't exist yet. Docker Compose creates it automatically — make sure you ran `make up` before `make api`.

**Mobile app can't connect to API**
You're probably on a physical device hitting `localhost`, which doesn't work.
Open `familyvault-mobile/src/api/client.ts` and change the `API_BASE_URL`:
- **Codespaces:** use the forwarded URL (e.g. `https://XXXX-8080.app.github.dev`)
- **Local + physical device:** use your machine's local IP (e.g. `http://192.168.1.x:8080`)
- **Simulator/emulator:** `http://localhost:8080` works fine

**Expo QR code won't scan in Codespaces**
Run `npx expo start --tunnel` instead of `npx expo start`. The tunnel mode creates a publicly reachable URL that your phone can connect to.

**JWT_SECRET error on startup**
The default secret in `application.yml` is intentionally weak (dev only).
Generate a strong one for production:
```bash
openssl rand -base64 64
```
Never commit this value — store it in AWS Secrets Manager.

---

## Project phases completed

| Phase | What was built |
|---|---|
| 1 | Spring Boot API · JWT auth with refresh token rotation · File endpoints · Docker · Flyway · Audit logging |
| 2 | React Native + Expo app · Biometric auth · Axios silent token refresh · SecureStore · Upload progress |
| 3 | GitHub Actions CI (test + build) · Codespaces devcontainer · Makefile |
| 4 | Terraform: VPC · RDS · ElastiCache · S3 · KMS · CloudFront · Secrets Manager · IAM · S3FileStorageService |
| 5 | Terraform: ECR · Elastic Beanstalk · Auto-scaling · Full CD pipeline deploy step |