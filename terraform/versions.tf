terraform {
  required_version = ">= 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Local state for now, while the infrastructure is first being built
  # and validated. Once the first successful apply proves the setup
  # works, this migrates to an S3 backend (with a DynamoDB lock table)
  # -- a well-documented, low-risk follow-up step, not something worth
  # bootstrapping before there is anything real to store state for yet.
}
