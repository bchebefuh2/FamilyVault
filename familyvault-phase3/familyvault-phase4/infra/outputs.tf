# ── Networking ────────────────────────────────────────────────────────────────

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

# ── API ───────────────────────────────────────────────────────────────────────

output "api_security_group_id" {
  description = "Security group ID for the Spring Boot API"
  value       = aws_security_group.api.id
}

output "api_iam_role_arn" {
  description = "IAM role ARN to attach to EC2 / ECS task running the API"
  value       = aws_iam_role.api.arn
}

# ── RDS ───────────────────────────────────────────────────────────────────────

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint (host:port)"
  value       = aws_db_instance.postgres.endpoint
  sensitive   = true
}

output "rds_db_name" {
  description = "PostgreSQL database name"
  value       = aws_db_instance.postgres.db_name
}

# ── ElastiCache ───────────────────────────────────────────────────────────────

output "redis_endpoint" {
  description = "ElastiCache Redis primary endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  sensitive   = true
}

# ── S3 ────────────────────────────────────────────────────────────────────────

output "s3_bucket_name" {
  description = "S3 bucket name for file uploads"
  value       = aws_s3_bucket.files.bucket
}

output "s3_bucket_arn" {
  description = "S3 bucket ARN"
  value       = aws_s3_bucket.files.arn
}

# ── KMS ───────────────────────────────────────────────────────────────────────

output "kms_key_id" {
  description = "KMS key ID for file encryption — add to GitHub Secrets as KMS_KEY_ID"
  value       = aws_kms_key.familyvault.key_id
}

output "kms_key_arn" {
  description = "KMS key ARN"
  value       = aws_kms_key.familyvault.arn
}

# ── CloudFront ────────────────────────────────────────────────────────────────

output "cloudfront_domain" {
  description = "CloudFront distribution domain — files are served from here"
  value       = "https://${aws_cloudfront_distribution.files.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.files.id
}

# ── Secrets Manager ───────────────────────────────────────────────────────────

output "secrets_manager_arn" {
  description = "Secrets Manager secret ARN — set as SECRETS_ARN in GitHub Secrets"
  value       = aws_secretsmanager_secret.app.arn
}

# ── Summary ───────────────────────────────────────────────────────────────────

output "github_secrets_to_add" {
  description = "Values to add as GitHub Actions secrets for the CD pipeline"
  value = {
    AWS_ROLE_ARN        = aws_iam_role.api.arn
    S3_BUCKET           = aws_s3_bucket.files.bucket
    KMS_KEY_ID          = aws_kms_key.familyvault.key_id
    CF_DISTRIBUTION_ID  = aws_cloudfront_distribution.files.id
    SECRETS_MANAGER_ARN = aws_secretsmanager_secret.app.arn
  }
  sensitive = true
}
