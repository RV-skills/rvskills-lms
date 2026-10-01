resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "${var.project_name}-cluster"
  }
}

# One CloudWatch log group per service, so each service's container
# logs land somewhere separate and queryable rather than all mixed
# together. 14-day retention: long enough to debug something recent,
# short enough not to accumulate cost indefinitely on a portfolio
# project with no long-term log-retention requirement.
resource "aws_cloudwatch_log_group" "services" {
  for_each = toset(local.services)

  name              = "/ecs/${var.project_name}/${each.value}"
  retention_in_days = 14

  tags = {
    Name = "${var.project_name}-${each.value}-logs"
  }
}
