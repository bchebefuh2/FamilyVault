# ── API Security Group ────────────────────────────────────────────────────────
# The Spring Boot application tier.

resource "aws_security_group" "api" {
  name        = "${var.project}-sg-api"
  description = "Spring Boot API — allow 8080 from load balancer; outbound to RDS/Redis/AWS"
  vpc_id      = aws_vpc.main.id

  # Allow traffic on port 8080 from within the VPC (load balancer or direct)
  ingress {
    description = "API port from VPC"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  # Allow all outbound — the API needs to reach RDS, Redis, and AWS service endpoints
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-sg-api" }
}

# ── RDS Security Group ────────────────────────────────────────────────────────
# PostgreSQL: only the API tier can connect.

resource "aws_security_group" "rds" {
  name        = "${var.project}-sg-rds"
  description = "PostgreSQL RDS — allow 5432 from API only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from API"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.api.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-sg-rds" }
}

# ── ElastiCache Security Group ────────────────────────────────────────────────
# Redis: only the API tier can connect.

resource "aws_security_group" "redis" {
  name        = "${var.project}-sg-redis"
  description = "ElastiCache Redis — allow 6379 from API only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Redis from API"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.api.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-sg-redis" }
}
