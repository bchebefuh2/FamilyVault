# ── S3 Bucket ─────────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "files" {
  bucket = "${var.project}-files-${data.aws_caller_identity.current.account_id}"

  # Prevent accidental deletion with files inside
  lifecycle {
    prevent_destroy = true
  }

  tags = { Name = "${var.project}-files" }
}

# ── Block all public access ───────────────────────────────────────────────────
# Files are accessed via presigned URLs or CloudFront — never directly public.

resource "aws_s3_bucket_public_access_block" "files" {
  bucket = aws_s3_bucket.files.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ── Versioning ────────────────────────────────────────────────────────────────
# Keeps previous versions of every file — enables "restore deleted file" feature.

resource "aws_s3_bucket_versioning" "files" {
  bucket = aws_s3_bucket.files.id

  versioning_configuration {
    status = "Enabled"
  }
}

# ── Server-Side Encryption with KMS ──────────────────────────────────────────
# Every object stored in S3 is encrypted using our CMK.
# bucket_key_enabled = true reduces KMS API calls (and cost) by 99%.

resource "aws_s3_bucket_server_side_encryption_configuration" "files" {
  bucket = aws_s3_bucket.files.id

  rule {
    bucket_key_enabled = true

    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.familyvault.arn
    }
  }
}

# ── CORS ──────────────────────────────────────────────────────────────────────
# Allows the React Native app to interact with S3 directly for presigned uploads.

resource "aws_s3_bucket_cors_configuration" "files" {
  bucket = aws_s3_bucket.files.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = ["*"]   # tighten to your production domain in prod
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# ── Lifecycle ─────────────────────────────────────────────────────────────────
# Clean up old versions after 90 days to control storage costs.

resource "aws_s3_bucket_lifecycle_configuration" "files" {
  bucket = aws_s3_bucket.files.id

  rule {
    id     = "expire-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# ── Bucket Policy ─────────────────────────────────────────────────────────────
# Only the CloudFront OAC and the API role can read objects.

resource "aws_s3_bucket_policy" "files" {
  bucket = aws_s3_bucket.files.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # CloudFront OAC can read objects (for CDN delivery)
      {
        Sid    = "AllowCloudFrontOAC"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.files.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.files.arn
          }
        }
      },
      # The API IAM role can read/write objects
      {
        Sid    = "AllowAPIRole"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.api.arn
        }
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:GetObjectVersion"
        ]
        Resource = "${aws_s3_bucket.files.arn}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.files]
}
