# ── CloudFront Origin Access Control ─────────────────────────────────────────
# OAC is the modern replacement for OAI — more secure, supports SSE-KMS.

resource "aws_cloudfront_origin_access_control" "files" {
  name                              = "${var.project}-oac"
  description                       = "OAC for FamilyVault S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ── CloudFront Distribution ───────────────────────────────────────────────────

resource "aws_cloudfront_distribution" "files" {
  enabled             = true
  comment             = "FamilyVault file CDN"
  default_root_object = ""
  price_class         = "PriceClass_100" # US, Canada, Europe only — cheapest tier

  # ── Origin: S3 bucket ───────────────────────────────────────────────────

  origin {
    domain_name              = aws_s3_bucket.files.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.files.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.files.id
  }

  # ── Cache Behavior ───────────────────────────────────────────────────────

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.files.id}"
    viewer_protocol_policy = "redirect-to-https" # never serve over HTTP

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    # Files like photos don't change — cache for 24 hours
    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000

    # Compress files automatically (gzip/brotli) — reduces transfer size
    compress = true
  }

  # ── Geo Restriction ──────────────────────────────────────────────────────
  # No restrictions — family members can be anywhere in the world.
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # ── HTTPS Certificate ────────────────────────────────────────────────────
  # Using the default CloudFront certificate (*.cloudfront.net domain).
  # Phase 5: swap for an ACM certificate on your custom domain.
  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = { Name = "${var.project}-cdn" }

  # Bucket policy references the distribution ARN — must create distribution first
  depends_on = [aws_s3_bucket_public_access_block.files]
}
