terraform {
  required_version = ">= 1.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state in S3 — create this bucket manually once, then all
  # teammates share the same state file (no more "works on my machine").
  # Run `terraform init` after setting this up.
  backend "s3" {
    bucket         = "familyvault-terraform-state"
    key            = "infra/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "familyvault-tf-locks" # prevents simultaneous applies
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "FamilyVault"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# ── Data Sources ─────────────────────────────────────────────────────────────

# Grab the current AWS account ID (used in KMS key policy)
data "aws_caller_identity" "current" {}

# Available AZs in the selected region
data "aws_availability_zones" "available" {
  state = "available"
}
