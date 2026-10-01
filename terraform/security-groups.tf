# The security group every ECS task (all 5 backend services + the
# frontend) will be attached to, once ECS exists. Created now, ahead of
# ECS itself, purely so RDS's security group below can reference it as
# the only thing allowed to connect to the database -- avoids a
# chicken-and-egg problem between "RDS needs to know what can reach it"
# and "ECS doesn't exist yet". Inbound rules (from the load balancer,
# etc.) get added once ECS/ALB are built.
resource "aws_security_group" "app" {
  name        = "${var.project_name}-app"
  description = "Attached to every ECS task in this project."
  vpc_id      = aws_vpc.main.id

  egress {
    description = "Allow all outbound traffic."
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-app-sg"
  }
}

# Real gap found live: AWS security groups do NOT implicitly allow
# members of the same group to reach each other -- only the two
# explicit ALB -> app rules (ports 3000/3005) exist so far. Nothing
# allowed the gateway (or any service) to reach another service on its
# internal port at all, which silently broke every cross-service call
# (gateway -> service-courses, service-enrollment -> service-courses,
# etc.) the moment this was deployed for real. A self-referencing rule:
# anything already in this security group can reach anything else in
# it, on any port.
resource "aws_security_group_rule" "app_self" {
  type = "ingress"

  from_port = 0

  to_port = 65535

  protocol = "tcp"

  security_group_id = aws_security_group.app.id

  source_security_group_id = aws_security_group.app.id

  description = "Allow services in this security group to reach each other"
}
