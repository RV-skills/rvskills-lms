locals {
  services = [
    "service-auth",
    "service-courses",
    "service-enrollment",
    "service-assessment",
    "service-gateway",
    "web",
  ]
}

resource "aws_ecr_repository" "services" {
  for_each = toset(local.services)

  name = "${var.project_name}/${each.value}"

  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "${var.project_name}-${each.value}-ecr"
  }
}

# Keeps each repository from growing unbounded: once there are more than
# 10 tagged images, the oldest ones get expired. Untagged images (left
# behind by a build that never got tagged/pushed successfully) expire
# after a single day, since nothing should ever reference them.
resource "aws_ecr_lifecycle_policy" "services" {
  for_each = aws_ecr_repository.services

  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images after 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep only the 10 most recent tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "latest", "sha-"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
