# NOTE ON STATE: values generated below (the RSA private key, the cookie secret)
# are written into Terraform state in plaintext, an inherent Terraform limitation.
# State lives in the encrypted S3 backend (see versions.tf), so access to that
# bucket must stay restricted to the people and roles that run Terraform.

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

# Stored in SSM Parameter Store as SecureString (encrypted with the AWS-managed
# key). Standard parameters are free; Secrets Manager charged $0.40 per secret
# a month. The values come from the same key and password resources as before,
# so moving them does not change any key or log anyone out.
# (The database password stays in Secrets Manager: RDS creates and manages it.)

resource "aws_ssm_parameter" "jwt_private_key" {
  name  = "/${var.project_name}/jwt-private-key"
  type  = "SecureString"
  value = tls_private_key.jwt.private_key_pem
}

resource "aws_ssm_parameter" "jwt_public_key" {
  name  = "/${var.project_name}/jwt-public-key"
  type  = "SecureString"
  value = tls_private_key.jwt.public_key_pem
}

resource "aws_ssm_parameter" "cookie_secret" {
  name  = "/${var.project_name}/cookie-secret"
  type  = "SecureString"
  value = random_password.cookie_secret.result
}
