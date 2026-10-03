resource "aws_security_group" "alb" {
  name        = "${var.project_name}-alb"
  description = "Public-facing load balancer: allows inbound HTTP from anywhere."
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP from anywhere."
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-alb-sg"
  }
}

# Only web (port 3000) and the gateway (port 3005) are ever reached from
# the load balancer -- the other 4 backend services are only reachable
# service-to-service, within the app security group itself. Adding
# these two rules to the shared "app" SG technically opens ports
# 3000/3005 on every container in that group, not just web/gateway, but
# that is harmless in practice: none of the other four services listen
# on those specific ports.
resource "aws_security_group_rule" "app_from_alb_web" {
  type = "ingress"

  from_port = 3000

  to_port = 3000

  protocol = "tcp"

  security_group_id = aws_security_group.app.id

  source_security_group_id = aws_security_group.alb.id

  description = "web, from the ALB"
}

resource "aws_security_group_rule" "app_from_alb_gateway" {
  type = "ingress"

  from_port = 3005

  to_port = 3005

  protocol = "tcp"

  security_group_id = aws_security_group.app.id

  source_security_group_id = aws_security_group.alb.id

  description = "gateway, from the ALB"
}

resource "aws_lb" "main" {
  name = "${var.project_name}-alb"

  internal = false

  load_balancer_type = "application"

  security_groups = [aws_security_group.alb.id]

  subnets = aws_subnet.public[*].id

  tags = {
    Name = "${var.project_name}-alb"
  }
}

resource "aws_lb_target_group" "web" {
  # name_prefix, not a fixed name: changing target_type forces
  # replacement, and AWS rejects a duplicate target group name while
  # the old one still exists -- create_before_destroy needs the new one
  # to get a distinct, auto-generated name during that overlap. ALB
  # target groups cap name_prefix at 6 characters specifically.
  name_prefix = "web-"

  port = 3000

  protocol = "HTTP"

  vpc_id = aws_vpc.main.id

  target_type = "instance"

  lifecycle {
    create_before_destroy = true
  }

  health_check {
    path                = "/"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
    matcher             = "200"
  }

  tags = {
    Name = "${var.project_name}-web-tg"
  }
}

resource "aws_lb_target_group" "gateway" {
  # See aws_lb_target_group.web above for why name_prefix, not name.
  name_prefix = "gw-"

  port = 3005

  protocol = "HTTP"

  vpc_id = aws_vpc.main.id

  target_type = "instance"

  lifecycle {
    create_before_destroy = true
  }

  # No dedicated health-check endpoint exists on the gateway yet -- this
  # reuses a real, genuinely public (no-auth-required) route as a stand-
  # in. A real /health or /ping route would be a cleaner, more honest
  # health check, and is worth adding as a small, separate follow-up.
  health_check {
    path                = "/api/v1/courses"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
    matcher             = "200"
  }

  tags = {
    Name = "${var.project_name}-gateway-tg"
  }
}

# Plain HTTP for now -- no domain or ACM certificate exists yet. HTTPS
# (a second listener on 443, with a real certificate, plus redirecting
# this HTTP listener to it) is a clear, separate follow-up once a real
# domain is chosen and pointed at this load balancer.
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn

  port = 80

  protocol = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web.arn
  }
}

# Everything under /api/* goes to the gateway instead of the frontend.
# The gateway already prefixes every one of its own routes with
# /api/v1/, so this needs no application-code changes to work.
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.http.arn

  priority = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.gateway.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}
