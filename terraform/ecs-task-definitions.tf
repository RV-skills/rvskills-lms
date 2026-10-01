locals {
  effective_frontend_origin = var.frontend_origin != "" ? var.frontend_origin : "http://${aws_lb.main.dns_name}"
  db_host                   = aws_db_instance.main.address
  db_port                   = tostring(aws_db_instance.main.port)
  db_name                   = aws_db_instance.main.db_name
  db_secret_arn             = aws_db_instance.main.master_user_secret[0].secret_arn
}

resource "aws_ecs_task_definition" "service_auth" {
  family = "${var.project_name}-service-auth"

  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn             = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "service-auth"
      image = "${aws_ecr_repository.services["service-auth"].repository_url}:${var.image_tag}"

      portMappings = [
        { containerPort = 3001, protocol = "tcp" }
      ]

      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "PORT", value = "3001" },
        { name = "CORS_ORIGIN", value = local.effective_frontend_origin },
        { name = "DB_HOST", value = local.db_host },
        { name = "DB_PORT", value = local.db_port },
        { name = "DB_NAME", value = local.db_name },
      ]

      secrets = [
        { name = "DB_USER", valueFrom = "${local.db_secret_arn}:username::" },
        { name = "DB_PASSWORD", valueFrom = "${local.db_secret_arn}:password::" },
        { name = "JWT_PRIVATE_KEY", valueFrom = aws_secretsmanager_secret.jwt_private_key.arn },
        { name = "JWT_PUBLIC_KEY", valueFrom = aws_secretsmanager_secret.jwt_public_key.arn },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.services["service-auth"].name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-service-auth-task"
  }
}

resource "aws_ecs_task_definition" "service_courses" {
  family = "${var.project_name}-service-courses"

  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn             = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "service-courses"
      image = "${aws_ecr_repository.services["service-courses"].repository_url}:${var.image_tag}"

      portMappings = [
        { containerPort = 3002, protocol = "tcp" }
      ]

      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "PORT", value = "3002" },
        { name = "DB_HOST", value = local.db_host },
        { name = "DB_PORT", value = local.db_port },
        { name = "DB_NAME", value = local.db_name },
      ]

      secrets = [
        { name = "DB_USER", valueFrom = "${local.db_secret_arn}:username::" },
        { name = "DB_PASSWORD", valueFrom = "${local.db_secret_arn}:password::" },
        { name = "JWT_PUBLIC_KEY", valueFrom = aws_secretsmanager_secret.jwt_public_key.arn },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.services["service-courses"].name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-service-courses-task"
  }
}

resource "aws_ecs_task_definition" "service_enrollment" {
  family = "${var.project_name}-service-enrollment"

  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn             = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "service-enrollment"
      image = "${aws_ecr_repository.services["service-enrollment"].repository_url}:${var.image_tag}"

      portMappings = [
        { containerPort = 3003, protocol = "tcp" }
      ]

      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "PORT", value = "3003" },
        { name = "DB_HOST", value = local.db_host },
        { name = "DB_PORT", value = local.db_port },
        { name = "DB_NAME", value = local.db_name },
        { name = "SERVICE_COURSES_URL", value = "http://service-courses.${aws_service_discovery_private_dns_namespace.internal.name}:3002" },
      ]

      secrets = [
        { name = "DB_USER", valueFrom = "${local.db_secret_arn}:username::" },
        { name = "DB_PASSWORD", valueFrom = "${local.db_secret_arn}:password::" },
        { name = "JWT_PUBLIC_KEY", valueFrom = aws_secretsmanager_secret.jwt_public_key.arn },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.services["service-enrollment"].name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-service-enrollment-task"
  }
}

resource "aws_ecs_task_definition" "service_assessment" {
  family = "${var.project_name}-service-assessment"

  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn             = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "service-assessment"
      image = "${aws_ecr_repository.services["service-assessment"].repository_url}:${var.image_tag}"

      portMappings = [
        { containerPort = 3004, protocol = "tcp" }
      ]

      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "PORT", value = "3004" },
        { name = "DB_HOST", value = local.db_host },
        { name = "DB_PORT", value = local.db_port },
        { name = "DB_NAME", value = local.db_name },
        { name = "SERVICE_COURSES_URL", value = "http://service-courses.${aws_service_discovery_private_dns_namespace.internal.name}:3002" },
        { name = "SERVICE_ENROLLMENT_URL", value = "http://service-enrollment.${aws_service_discovery_private_dns_namespace.internal.name}:3003" },
      ]

      secrets = [
        { name = "DB_USER", valueFrom = "${local.db_secret_arn}:username::" },
        { name = "DB_PASSWORD", valueFrom = "${local.db_secret_arn}:password::" },
        { name = "JWT_PUBLIC_KEY", valueFrom = aws_secretsmanager_secret.jwt_public_key.arn },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.services["service-assessment"].name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-service-assessment-task"
  }
}

resource "aws_ecs_task_definition" "service_gateway" {
  family = "${var.project_name}-service-gateway"

  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn             = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "service-gateway"
      image = "${aws_ecr_repository.services["service-gateway"].repository_url}:${var.image_tag}"

      portMappings = [
        { containerPort = 3005, protocol = "tcp" }
      ]

      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "PORT", value = "3005" },
        { name = "CORS_ORIGIN", value = local.effective_frontend_origin },
        { name = "SERVICE_AUTH_URL", value = "http://service-auth.${aws_service_discovery_private_dns_namespace.internal.name}:3001" },
        { name = "SERVICE_COURSES_URL", value = "http://service-courses.${aws_service_discovery_private_dns_namespace.internal.name}:3002" },
        { name = "SERVICE_ENROLLMENT_URL", value = "http://service-enrollment.${aws_service_discovery_private_dns_namespace.internal.name}:3003" },
        { name = "SERVICE_ASSESSMENT_URL", value = "http://service-assessment.${aws_service_discovery_private_dns_namespace.internal.name}:3004" },
      ]

      secrets = [
        { name = "COOKIE_SECRET", valueFrom = aws_secretsmanager_secret.cookie_secret.arn },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.services["service-gateway"].name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-service-gateway-task"
  }
}

# NEXT_PUBLIC_GATEWAY_URL is already baked into the built JS bundle at
# Docker image build time (a build ARG, not a runtime env var -- see
# apps/web/Dockerfile). Nothing web-specific needs to be injected here
# at runtime.
resource "aws_ecs_task_definition" "web" {
  family = "${var.project_name}-web"

  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn             = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "web"
      image = "${aws_ecr_repository.services["web"].repository_url}:${var.image_tag}"

      portMappings = [
        { containerPort = 3000, protocol = "tcp" }
      ]

      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "PORT", value = "3000" },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.services["web"].name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-web-task"
  }
}
