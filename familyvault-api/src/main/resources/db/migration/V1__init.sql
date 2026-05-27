-- ============================================================
-- V1__init.sql  –  FamilyVault initial schema
-- ============================================================

-- ── families ──────────────────────────────────────────────
CREATE TABLE families (
    id          VARCHAR(36)  PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    invite_code VARCHAR(20)  UNIQUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── users ─────────────────────────────────────────────────
CREATE TABLE users (
    id         VARCHAR(36)  PRIMARY KEY,
    email      VARCHAR(255) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name  VARCHAR(100),
    role       VARCHAR(20)  NOT NULL DEFAULT 'MEMBER',
    family_id  VARCHAR(36)  REFERENCES families(id) ON DELETE SET NULL,
    enabled    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── file_metadata ─────────────────────────────────────────
CREATE TABLE file_metadata (
    id            VARCHAR(36)  PRIMARY KEY,
    original_name VARCHAR(500) NOT NULL,
    storage_path  TEXT         NOT NULL,
    content_type  VARCHAR(100),
    size          BIGINT,
    uploaded_by   VARCHAR(36)  REFERENCES users(id) ON DELETE SET NULL,
    family_id     VARCHAR(36)  REFERENCES families(id) ON DELETE CASCADE,
    deleted       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── audit_logs ────────────────────────────────────────────
CREATE TABLE audit_logs (
    id            VARCHAR(36)  PRIMARY KEY,
    user_id       VARCHAR(36),
    user_email    VARCHAR(255),
    family_id     VARCHAR(36),
    action        VARCHAR(50)  NOT NULL,
    resource_type VARCHAR(50),
    resource_id   VARCHAR(36),
    ip_address    VARCHAR(50),
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── indexes ───────────────────────────────────────────────
CREATE INDEX idx_users_email              ON users(email);
CREATE INDEX idx_users_family_id          ON users(family_id);
CREATE INDEX idx_file_metadata_family_id  ON file_metadata(family_id);
CREATE INDEX idx_file_metadata_deleted    ON file_metadata(deleted);
CREATE INDEX idx_audit_logs_user_id       ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_family_id     ON audit_logs(family_id);
CREATE INDEX idx_audit_logs_created_at    ON audit_logs(created_at DESC);
