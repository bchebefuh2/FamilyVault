# FamilyVault — Common commands
# Usage: make <target>
# Requires: Docker Desktop, Java 17, Maven, Node 20

.PHONY: up down api mobile test build logs clean help

# ── Infrastructure ────────────────────────────────────────────────────────────

up:
	@echo "▶  Starting Postgres + Redis..."
	docker compose up -d postgres redis
	@echo "✓  Services running. Postgres: localhost:5432 | Redis: localhost:6379"

down:
	@echo "▶  Stopping all containers..."
	docker compose down
	@echo "✓  Done"

logs:
	docker compose logs -f

# ── Backend ───────────────────────────────────────────────────────────────────

api:
	@echo "▶  Starting Spring Boot API..."
	@echo "   Swagger UI → http://localhost:8080/swagger-ui.html"
	cd familyvault-api && mvn spring-boot:run

test:
	@echo "▶  Running backend tests..."
	cd familyvault-api && mvn test
	@echo "✓  Tests complete"

build:
	@echo "▶  Building JAR..."
	cd familyvault-api && mvn package -DskipTests
	@echo "✓  JAR → familyvault-api/target/familyvault-api-*.jar"

docker-build:
	@echo "▶  Building Docker image..."
	docker build -t familyvault-api:local familyvault-api/
	@echo "✓  Image: familyvault-api:local"

# ── Mobile ────────────────────────────────────────────────────────────────────

mobile:
	@echo "▶  Starting Expo dev server..."
	@echo "   Scan QR with Expo Go app on your phone"
	cd familyvault-mobile && npx expo start

mobile-install:
	cd familyvault-mobile && npm install

# ── Full stack (runs everything together) ─────────────────────────────────────

stack: up
	@echo "▶  Starting full stack..."
	@echo "   Run 'make api' in one terminal and 'make mobile' in another"

# ── Cleanup ───────────────────────────────────────────────────────────────────

clean:
	cd familyvault-api && mvn clean
	docker compose down -v   # also removes volumes (wipes DB data)
	@echo "✓  Cleaned"

# ── Help ─────────────────────────────────────────────────────────────────────

help:
	@echo ""
	@echo "  FamilyVault — available commands"
	@echo ""
	@echo "  Infrastructure"
	@echo "    make up           Start Postgres + Redis containers"
	@echo "    make down         Stop all containers"
	@echo "    make logs         Tail container logs"
	@echo ""
	@echo "  Backend"
	@echo "    make api          Run Spring Boot API (requires: make up)"
	@echo "    make test         Run all backend tests"
	@echo "    make build        Build production JAR"
	@echo "    make docker-build Build Docker image locally"
	@echo ""
	@echo "  Mobile"
	@echo "    make mobile       Start Expo dev server"
	@echo "    make mobile-install  Install npm packages"
	@echo ""
	@echo "  Other"
	@echo "    make clean        Remove build artifacts + wipe DB volumes"
	@echo ""
