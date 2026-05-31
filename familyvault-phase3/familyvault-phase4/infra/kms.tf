# ── KMS Customer Managed Key ─────────────────────────────────────────────────
# Used to encrypt all files in S3 (SSE-KMS).
# Using a CMK instead of the default AWS-managed key gives you:
#   - Full audit trail via CloudTrail
#   - Ability to revoke access per-family (future enhancement)
#   - Key rotation control

resource "aws_kms_key" "familyvault" {
  description             = "FamilyVault — S3 file encryption key"
  deletion_window_in_days = 30        # safety net before permanent deletion
  enable_key_rotation     = true      # AWS rotates the key material annually

  # Key policy: defines who can use and administer the key
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Root account has full control — prevents lockout
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      # Allow S3 to use the key for server-side encryption
      {
        Sid    = "Allow S3 SSE-KMS"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action = [
          "kms:GenerateDataKey",
          "kms:Decrypt"
        ]
        Resource = "*"
      },
      # Allow the API's IAM role to encrypt/decrypt (role created in iam.tf)
      {
        Sid    = "Allow API to use key"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.api.arn
        }
        Action = [
          "kms:GenerateDataKey",
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = { Name = "${var.project}-kms-key" }
}

resource "aws_kms_alias" "familyvault" {
  name          = "alias/${var.project}-files"
  target_key_id = aws_kms_key.familyvault.key_id
}
