resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds"
  description = "Allows Postgres traffic only from the app security group."
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Postgres from the app tier."
    from_port        = 5432
    to_port          = 5432
    protocol         = "tcp"
    security_groups  = [aws_security_group.app.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-rds-sg"
  }
}

# One RDS instance shared by every service that needs a database (auth,
# courses, enrollment, assessment). The instance itself only creates one
# initial database at provisioning time; the other three this project
# needs are a separate, deliberate follow-up -- either via the
# cyrilgdn/postgresql Terraform provider, or created once manually /
# during each service's own migration step. Not solved here.
resource "aws_db_instance" "main" {
  identifier     = "${var.project_name}-db"
  engine         = "postgres"
  engine_version = "16.4"

  instance_class    = "db.t4g.micro"
  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = "rvskills"
  username = "rvskills_admin"

  # AWS creates and manages this credential in Secrets Manager directly.
  # Terraform never sees or stores the actual password -- the state file
  # only ever holds the secret's ARN, not its value.
  manage_master_user_password = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az                = false

  backup_retention_period = 7

  # Simplification while this infrastructure is still being built and
  # iterated on: forcing a final snapshot on every destroy would slow
  # down getting the rest of this right. Worth revisiting
  # (skip_final_snapshot = false, with a real final_snapshot_identifier)
  # once this is genuinely stable and holding real data.
  skip_final_snapshot = true

  tags = {
    Name = "${var.project_name}-db"
  }
}
