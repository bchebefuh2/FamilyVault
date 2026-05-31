# Phase 4 — AWS Infrastructure

This phase provisions all AWS resources using Terraform and swaps local file
storage for S3 + KMS encryption.

---

## What gets created

| Resource | Purpose |
|---|---|
| VPC + Subnets | Isolated network — API/DB/Redis in private subnets |
| RDS PostgreSQL 16 | Production database, encrypted, Multi-AZ |
| ElastiCache Redis 7 | Refresh token store + caching, encrypted |
| S3 Bucket | File/photo storage with versioning |
| KMS CMK | Encrypts every file in S3 at rest |
| CloudFront CDN | Fast global file delivery, HTTPS only |
| Secrets Manager | Stores all credentials — no env vars with secrets |
| IAM Role | Least-privilege role for the API (no access keys) |

---

## One-time AWS account setup

Before running Terraform you need two things:

### 1. Create the Terraform state bucket (do this manually once)
```bash
aws s3api create-bucket \
  --bucket familyvault-terraform-state \
  --region us-east-1

aws s3api put-bucket-versioning \
  --bucket familyvault-terraform-state \
  --versioning-configuration Status=Enabled

aws dynamodb create-table \
  --table-name familyvault-tf-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### 2. Set up GitHub OIDC trust (replaces long-lived access keys)
```bash
# Create the OIDC provider in your AWS account (one time only)
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```
Then create an IAM role that trusts GitHub Actions — see the [AWS docs](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services).

---

## Apply the infrastructure

```bash
cd infra

# Initialize — downloads providers, sets up remote state
terraform init

# Copy and edit the example vars file
cp terraform.tfvars.example terraform.tfvars

# Set sensitive vars as environment variables (never in the .tfvars file)
export TF_VAR_db_password="$(openssl rand -base64 24)"
export TF_VAR_jwt_secret="$(openssl rand -base64 64)"

# Preview what will be created (~30 resources)
terraform plan

# Apply — takes about 10-15 minutes (RDS takes the longest)
terraform apply
```

After apply, Terraform prints all outputs including the GitHub secrets you need.

---

## Apply the Spring Boot changes

```bash
# 1. Copy the new files into your familyvault-api project
cp api-changes/src/main/java/com/familyvault/config/AwsConfig.java \
   ../familyvault-api/src/main/java/com/familyvault/config/

cp api-changes/src/main/java/com/familyvault/service/S3FileStorageService.java \
   ../familyvault-api/src/main/java/com/familyvault/service/

cp api-changes/src/main/resources/application-prod.yml \
   ../familyvault-api/src/main/resources/

# 2. Add the AWS SDK dependencies to pom.xml
# Open pom-additions.xml and copy the blocks into familyvault-api/pom.xml

# 3. Run locally in prod mode (requires AWS credentials configured)
cd ../familyvault-api
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

---

## Add GitHub Secrets

After `terraform apply`, run:
```bash
terraform output -json github_secrets_to_add
```

Then add each value in **GitHub → Settings → Secrets and variables → Actions**:

| Secret name | Where it comes from |
|---|---|
| `AWS_ROLE_ARN` | `terraform output api_iam_role_arn` |
| `S3_BUCKET` | `terraform output s3_bucket_name` |
| `KMS_KEY_ID` | `terraform output kms_key_id` |
| `CF_DISTRIBUTION_ID` | `terraform output cloudfront_distribution_id` |
| `SECRETS_MANAGER_ARN` | `terraform output secrets_manager_arn` |

---

## Tear it all down (to avoid AWS charges)

```bash
terraform destroy
```
⚠️ This will delete all data. RDS has `deletion_protection = true` — you must
disable it in the console or in Terraform before destroy will work.

---

## Estimated monthly cost (us-east-1)

| Resource | Cost |
|---|---|
| RDS db.t3.micro | ~$15/mo |
| ElastiCache cache.t3.micro | ~$12/mo |
| NAT Gateway (x2) | ~$65/mo |
| CloudFront | ~$1/mo (free tier: 1TB) |
| S3 | ~$0.02/GB |
| **Total** | **~$95/mo** |

> **Tip:** Use `db.t3.micro` + `cache.t3.micro` + single NAT Gateway for dev to cut costs to ~$30/mo.
