terraform {
  required_version = ">= 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }

    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }

    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  backend "s3" {
    bucket         = "rvskills-terraform-state"
    key            = "rvskills/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "rvskills-terraform-locks"
    encrypt        = true
  }
}
