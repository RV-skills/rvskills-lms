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
