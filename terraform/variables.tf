variable "aws_region" {
  description = "AWS region everything is deployed into."
  type        = string
  default     = "ap-south-1"
}

variable "project_name" {
  description = "Short name used as a prefix for every resource this project creates."
  type        = string
  default     = "rvskills"
}

variable "environment" {
  description = "Deployment environment name (e.g. production, staging)."
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zone_count" {
  description = "Number of availability zones to spread public/private subnets across."
  type        = number
  default     = 2
}

variable "image_tag" {
  description = "Image tag to deploy for every service. Overridden by the CI/CD workflow with a real commit SHA once that exists; defaults to 'latest' for manual applies."
  type        = string
  default     = "latest"
}

variable "frontend_origin" {
  description = "Origin the backend's CORS policy allows. Defaults to the ALB's own DNS name; override with a real domain once one exists."
  type        = string
  default     = "https://lms1.rv-skills.com"
}

variable "secret_rotation_id" {
  description = "Change this (e.g. to today's date) to generate a new JWT key pair and cookie secret on the next apply. Changing it logs everyone out."
  type        = string
  default     = "2026-10-09-rotation-1"
}
