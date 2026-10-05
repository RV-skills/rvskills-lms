# desired_count = 1 everywhere: keeps cost low at this project's scale.
# A real production setup would run at least 2 per service for actual
# high availability; easy to raise later via a variable once that
# matters.
#
# EC2 launch type, not FARGATE: all 6 services run as plain Docker
# containers on a single shared EC2 instance (see ecs-ec2.tf), to avoid
# Fargate's per-task hourly charge, which was the single largest cost
# driver at this project's near-zero-traffic scale. No
# network_configuration block here: that's an awsvpc-mode/Fargate
# concept, not applicable to bridge-mode EC2 tasks. No service_registries
# either: with every container on the same host, services reach each
# other over plain localhost (see the SERVICE_*_URL env vars in
# ecs-task-definitions.tf), so Cloud Map's own small cost and complexity
# were removed entirely rather than kept unused.

resource "aws_ecs_service" "service_auth" {
  name = "${var.project_name}-service-auth"

  cluster = aws_ecs_cluster.main.id

  task_definition = aws_ecs_task_definition.service_auth.arn

  desired_count = 1

  launch_type = "EC2"

  deployment_minimum_healthy_percent = 0

  deployment_maximum_percent = 100

  tags = {
    Name = "${var.project_name}-service-auth"
  }
}

resource "aws_ecs_service" "service_courses" {
  name = "${var.project_name}-service-courses"

  cluster = aws_ecs_cluster.main.id

  task_definition = aws_ecs_task_definition.service_courses.arn

  desired_count = 1

  launch_type = "EC2"

  deployment_minimum_healthy_percent = 0

  deployment_maximum_percent = 100

  tags = {
    Name = "${var.project_name}-service-courses"
  }
}

resource "aws_ecs_service" "service_enrollment" {
  name = "${var.project_name}-service-enrollment"

  cluster = aws_ecs_cluster.main.id

  task_definition = aws_ecs_task_definition.service_enrollment.arn

  desired_count = 1

  launch_type = "EC2"

  deployment_minimum_healthy_percent = 0

  deployment_maximum_percent = 100

  tags = {
    Name = "${var.project_name}-service-enrollment"
  }
}

resource "aws_ecs_service" "service_assessment" {
  name = "${var.project_name}-service-assessment"

  cluster = aws_ecs_cluster.main.id

  task_definition = aws_ecs_task_definition.service_assessment.arn

  desired_count = 1

  launch_type = "EC2"

  deployment_minimum_healthy_percent = 0

  deployment_maximum_percent = 100

  tags = {
    Name = "${var.project_name}-service-assessment"
  }
}

resource "aws_ecs_service" "service_gateway" {
  name = "${var.project_name}-service-gateway"

  cluster = aws_ecs_cluster.main.id

  task_definition = aws_ecs_task_definition.service_gateway.arn

  desired_count = 1

  launch_type = "EC2"

  deployment_minimum_healthy_percent = 0

  deployment_maximum_percent = 100

  load_balancer {
    target_group_arn = aws_lb_target_group.gateway.arn

    container_name = "service-gateway"

    container_port = 3005
  }

  depends_on = [aws_lb_listener.http, aws_autoscaling_group.ecs]

  tags = {
    Name = "${var.project_name}-service-gateway"
  }
}

resource "aws_ecs_service" "web" {
  name = "${var.project_name}-web"

  cluster = aws_ecs_cluster.main.id

  task_definition = aws_ecs_task_definition.web.arn

  desired_count = 1

  launch_type = "EC2"

  deployment_minimum_healthy_percent = 0

  deployment_maximum_percent = 100

  load_balancer {
    target_group_arn = aws_lb_target_group.web.arn

    container_name = "web"

    container_port = 3000
  }

  depends_on = [aws_lb_listener.http, aws_autoscaling_group.ecs]

  tags = {
    Name = "${var.project_name}-web"
  }
}
