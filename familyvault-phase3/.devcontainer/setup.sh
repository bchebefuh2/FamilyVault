#!/bin/bash
# .devcontainer/setup.sh
# Runs once after the Codespace container is created.
# Pre-downloads all dependencies so your first `mvn spring-boot:run` is fast.

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FamilyVault — Codespace setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Java / Maven ─────────────────────────────────────────────────────────────
echo ""
echo "▶  Pre-downloading Maven dependencies..."
cd familyvault-api
mvn dependency:go-offline -q
echo "✓  Maven dependencies ready"
cd ..

# ── Node / Expo ──────────────────────────────────────────────────────────────
echo ""
echo "▶  Installing mobile app dependencies..."
cd familyvault-mobile
npm install --silent
echo "✓  Node modules ready"
cd ..

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Setup complete! Run the following to get started:"
echo ""
echo "    make up       → start Postgres + Redis"
echo "    make api      → start the Spring Boot API"
echo "    make mobile   → start the Expo dev server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
