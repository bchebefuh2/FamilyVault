# ═══════════════════════════════════════════════════════════════════════════════
#  RDS — PostgreSQL 16
# ═══════════════════════════════════════════════════════════════════════════════

resource "aws_db_subnet_group" "main" {
  name        = "${var.project}-db-subnet-group"
  description = "Private subnets for RDS"
  subnet_ids  = aws_subnet.private[*].id

  tags = { Name = "${var.project}-db-subnet-group" }
}

resource "aws_db_parameter_group" "postgres" {
  name        = "${var.project}-postgres16"
  family      = "postgres16"
  description = "FamilyVault PostgreSQL 16 parameter group"

  # Force SSL connections — no unencrypted DB traffic ever
  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  # Log slow queries (anything over 1 second) for performance monitoring
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  tags = { Name = "${var.project}-pg-params" }
}

resource "aws_db_instance" "postgres" {
  identifier = "${var.project}-postgres"

  # Engine
  engine               = "postgres"
  engine_version       = "16.1"
  instance_class       = var.db_instance_class
  parameter_group_name = aws_db_parameter_group.postgres.name

  # Storage — auto-scales up to 100 GB if needed
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.familyvault.arn

  # Credentials
  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  # Network — lives in private subnets, no public endpoint
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # High availability
  multi_az = var.db_multi_az

  # Backups — 7-day retention window
  backup_retention_period = 7
  backup_window           = "03:00-04:00" # 3–4 AM UTC
  maintenance_window      = "sun:04:00-sun:05:00"

  # Prevent accidental deletion
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.project}-postgres-final-snapshot"

  # Performance Insights — free tier, shows query-level metrics in AWS Console
  performance_insights_enabled = true

  tags = { Name = "${var.project}-postgres" }
}

# ═══════════════════════════════════════════════════════════════════════════════
#  ElastiCache — Redis 7
# ═══════════════════════════════════════════════════════════════════════════════

resource "aws_elasticache_subnet_group" "main" {
  name        = "${var.project}-redis-subnet-group"
  description = "Private subnets for ElastiCache"
  subnet_ids  = aws_subnet.private[*].id

  tags = { Name = "${var.project}-redis-subnet-group" }
}

resource "aws_elasticache_parameter_group" "redis" {
  name        = "${var.project}-redis7"
  family      = "redis7"
  description = "FamilyVault Redis 7 parameter group"
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "${var.project}-redis"
  description          = "FamilyVault Redis — refresh tokens and caching"

  node_type            = var.redis_node_type
  port                 = 6379
  parameter_group_name = aws_elasticache_parameter_group.redis.name

  # Single node for cost savings — set num_cache_clusters = 2 for HA
  num_cache_clusters = 1

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  # Encryption in transit (TLS) and at rest
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  kms_key_id                 = aws_kms_key.familyvault.arn

  # Automatic backups
  snapshot_retention_limit = 3
  snapshot_window          = "02:00-03:00"

  apply_immediately = true

  tags = { Name = "${var.project}-redis" }
}
