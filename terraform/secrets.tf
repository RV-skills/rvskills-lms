# NOTE ON STATE: every value generated below (the RSA private key, the
# cookie secret) gets written into Terraform's own state file in
# plaintext -- an inherent Terraform limitation, not something specific
# to this file. Right now this project still uses local state (see the
# comment in versions.tf), which means these real secrets currently sit
# in plaintext on whichever machine runs terraform apply. This is a real
# reason to prioritize the S3 + encrypted-state migration before this
# is ever applied against production for real, not just a theoretical
# concern to revisit "eventually".

# Changing var.secret_rotation_id replaces this, which in turn replaces the
# secrets below (see their lifecycle blocks), so rotation is a reviewed one-line change.
resource "terraform_data" "secret_rotation" {
  triggers_replace = var.secret_rotation_id
}

resource "tls_private_key" "jwt" {
  algorithm = "RSA"
  rsa_bits  = 2048

  lifecycle {
    replace_triggered_by = [terraform_data.secret_rotation]
  }
}

resource "random_password" "cookie_secret" {
  length  = 48
  special = false

  lifecycle {
    replace_triggered_by = [terraform_data.secret_rotation]
  }
}

resource "aws_secretsmanager_secret" "jwt_private_key" {
  name = "${var.project_name}/jwt-private-key"

  tags = {
    Name = "${var.project_name}-jwt-private-key"
  }
}

resource "aws_secretsmanager_secret_version" "jwt_private_key" {
  secret_id     = aws_secretsmanager_secret.jwt_private_key.id
  secret_string = tls_private_key.jwt.private_key_pem
}

resource "aws_secretsmanager_secret" "jwt_public_key" {
  name = "${var.project_name}/jwt-public-key"

  tags = {
    Name = "${var.project_name}-jwt-public-key"
  }
}

resource "aws_secretsmanager_secret_version" "jwt_public_key" {
  secret_id     = aws_secretsmanager_secret.jwt_public_key.id
  secret_string = tls_private_key.jwt.public_key_pem
}

resource "aws_secretsmanager_secret" "cookie_secret" {
  name = "${var.project_name}/cookie-secret"

  tags = {
    Name = "${var.project_name}-cookie-secret"
  }
}

resource "aws_secretsmanager_secret_version" "cookie_secret" {
  secret_id     = aws_secretsmanager_secret.cookie_secret.id
  secret_string = random_password.cookie_secret.result
}
