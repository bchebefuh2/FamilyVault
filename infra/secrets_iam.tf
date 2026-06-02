# ═══════════════════════════════════════════════════════════════════════════════
#  AWS Secrets Manager
#  Stores all sensitive config. The Spring Boot app reads these at startup
#  via spring-cloud-aws — no secrets ever in environment variables or code.
# ═══════════════════════════════════════════════════════════════════════════════

resource "aws_secretsmanager_secret" "app" {
  name                    = "${var.project}/app-secrets"
  description             = "FamilyVault application secrets"
  kms_key_id              = aws_kms_key.familyvault.arn
  recovery_window_in_days = 7  # 7-day safety window before permanent deletion

  tags = { Name = "${var.project}-app-secrets" }
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id

  # All secrets in one JSON blob — read once at startup, no N separate API calls
  secret_string = jsonencode({
    DB_URL      = "jdbc:postgresql://${aws_db_instance.postgres.endpoint}/${var.db_name}?sslmode=require"
    DB_USERNAME = var.db_username
    DB_PASSWORD = var.db_password
    REDIS_HOST  = aws_elasticache_replication_group.redis.primary_endpoint_address
    REDIS_PORT  = "6379"
    JWT_SECRET  = var.jwt_secret
    S3_BUCKET   = aws_s3_bucket.files.bucket
    KMS_KEY_ID  = aws_kms_key.familyvault.key_id
    CF_DOMAIN   = "https://${aws_cloudfront_distribution.files.domain_name}"
  })
}

# ═══════════════════════════════════════════════════════════════════════════════
#  IAM — API Role
#  The Spring Boot application assumes this role (via EC2 instance profile
#  or ECS task role). Grants exactly the permissions needed — nothing more.
# ═══════════════════════════════════════════════════════════════════════════════

resource "aws_iam_role" "api" {
  name        = "${var.project}-api-role"
  description = "Role assumed by the FamilyVault Spring Boot API"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "ec2.amazonaws.com" }
        Action    = "sts:AssumeRole"
      }
    ]
  })

  tags = { Name = "${var.project}-api-role" }
}

# ── S3 permissions ────────────────────────────────────────────────────────────

resource "aws_iam_role_policy" "api_s3" {
  name = "${var.project}-api-s3-policy"
  role = aws_iam_role.api.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:GetObjectVersion",
          "s3:ListBucketVersions"
        ]
        Resource = "${aws_s3_bucket.files.arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.files.arn
      }
    ]
  })
}

# ── Secrets Manager permissions ───────────────────────────────────────────────

resource "aws_iam_role_policy" "api_secrets" {
  name = "${var.project}-api-secrets-policy"
  role = aws_iam_role.api.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = aws_secretsmanager_secret.app.arn
      }
    ]
  })
}

# ── KMS permissions ───────────────────────────────────────────────────────────

resource "aws_iam_role_policy" "api_kms" {
  name = "${var.project}-api-kms-policy"
  role = aws_iam_role.api.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kms:GenerateDataKey",
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = aws_kms_key.familyvault.arn
      }
    ]
  })
}

# ── EC2 instance profile ──────────────────────────────────────────────────────
# Attaches the role to an EC2 instance so the app can use it without credentials.

resource "aws_iam_instance_profile" "api" {
  name = "${var.project}-api-profile"
  role = aws_iam_role.api.name
}
