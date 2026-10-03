# desired_count = 1 everywhere: keeps cost low at this project's scale.
# A real production setup would run at least 2 per service for actual
# high availability; easy to raise later via a variable once that
# matters.

resource "aws_ecs_service" "service_auth" {
  name = "${var.project_name}-service-auth"

  cluster = aws_ecs_cluster.main.id

  task_definition = aws_ecs_task_definition.service_auth.arn

  desired_count = 1

  launch_type = "FARGATE"

  network_configuration {
    subnets = aws_subnet.public[*].id

    security_groups = [aws_security_group.app.id]

    assign_public_ip = true
  }

  service_registries {
    registry_arn = aws_service_discovery_service.internal["service-auth"].arn
  }

  tags = {
    Name = "${var.project_name}-service-auth"
  }
}

resource "aws_ecs_service" "service_courses" {
  name = "${var.project_name}-service-courses"

  cluster = aws_ecs_cluster.main.id

  task_definition = aws_ecs_task_definition.service_courses.arn

  desired_count = 1

  launch_type = "FARGATE"

  network_configuration {
    subnets = aws_subnet.public[*].id

    security_groups = [aws_security_group.app.id]

    assign_public_ip = true
  }

  service_registries {
    registry_arn = aws_service_discovery_service.internal["service-courses"].arn
  }

  tags = {
    Name = "${var.project_name}-service-courses"
  }
}

resource "aws_ecs_service" "service_enrollment" {
  name = "${var.project_name}-service-enrollment"

  cluster = aws_ecs_cluster.main.id

  task_definition = aws_ecs_task_definition.service_enrollment.arn

  desired_count = 1

  launch_type = "FARGATE"

  network_configuration {
    subnets = aws_subnet.public[*].id

    security_groups = [aws_security_group.app.id]

    assign_public_ip = true
  }

  service_registries {
    registry_arn = aws_service_discovery_service.internal["service-enrollment"].arn
  }

  tags = {
    Name = "${var.project_name}-service-enrollment"
  }
}

resource "aws_ecs_service" "service_assessment" {
  name = "${var.project_name}-service-assessment"

  cluster = aws_ecs_cluster.main.id

  task_definition = aws_ecs_task_definition.service_assessment.arn

  desired_count = 1

  launch_type = "FARGATE"

  network_configuration {
    subnets = aws_subnet.public[*].id

    security_groups = [aws_security_group.app.id]

    assign_public_ip = true
  }

  service_registries {
    registry_arn = aws_service_discovery_service.internal["service-assessment"].arn
  }

  tags = {
    Name = "${var.project_name}-service-assessment"
  }
}

resource "aws_ecs_service" "service_gateway" {
  name = "${var.project_name}-service-gateway"

  cluster = aws_ecs_cluster.main.id

  task_definition = aws_ecs_task_definition.service_gateway.arn

  desired_count = 1

  launch_type = "FARGATE"

  network_configuration {
    subnets = aws_subnet.public[*].id

    security_groups = [aws_security_group.app.id]

    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.gateway.arn

    container_name = "service-gateway"

    container_port = 3005
  }

  depends_on = [aws_lb_listener.http]

  tags = {
    Name = "${var.project_name}-service-gateway"
  }
}

resource "aws_ecs_service" "web" {
  name = "${var.project_name}-web"

  cluster = aws_ecs_cluster.main.id

  task_definition = aws_ecs_task_definition.web.arn

  desired_count = 1

  launch_type = "FARGATE"

  network_configuration {
    subnets = aws_subnet.public[*].id

    security_groups = [aws_security_group.app.id]

    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.web.arn

    container_name = "web"

    container_port = 3000
  }

  depends_on = [aws_lb_listener.http]

  tags = {
    Name = "${var.project_name}-web"
  }
}
