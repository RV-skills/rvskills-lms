# The EC2 instance all 6 ECS services actually run on, as plain Docker
# containers (EC2 launch type, bridge network mode -- see
# ecs-task-definitions.tf and ecs-services.tf). Replaces Fargate, which
# was this project's single largest cost driver at its current
# near-zero-traffic scale: a Fargate task is billed per-task, per-hour,
# regardless of how little work it's actually doing, where a single
# small EC2 instance is Free Tier eligible (t2.micro, 750 hrs/month for
# the first 12 months) and runs all 6 services for close to $0.
#
# A single fixed instance, not an auto-scaling fleet: this project runs
# at desired_count = 1 per service already (see ecs-services.tf), so
# there's nothing for a second host to do. An aws_autoscaling_group with
# min = max = desired = 1 is used anyway, rather than a plain
# aws_instance, purely so a terminated/unhealthy instance is
# automatically replaced -- the ASG is a self-healing wrapper around one
# instance, not a scaling mechanism here.

data "aws_ssm_parameter" "ecs_ami" {
  name = "/aws/service/ecs/optimized-ami/amazon-linux-2/recommended/image_id"
}

data "aws_iam_policy_document" "ec2_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

# The role the EC2 instance itself assumes, so its ECS agent can
# register the instance with the cluster, report task status, pull
# images, and write logs. Distinct from aws_iam_role.ecs_execution
# (iam.tf) and aws_iam_role.ecs_task (iam.tf), which govern what each
# individual container can do -- this one governs what the host itself,
# and the ECS agent running on it, can do.
resource "aws_iam_role" "ecs_instance" {
  name = "${var.project_name}-ecs-instance"

  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json

  tags = {
    Name = "${var.project_name}-ecs-instance"
  }
}

resource "aws_iam_role_policy_attachment" "ecs_instance_managed" {
  role       = aws_iam_role.ecs_instance.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}

resource "aws_iam_instance_profile" "ecs_instance" {
  name = "${var.project_name}-ecs-instance"
  role = aws_iam_role.ecs_instance.name
}

resource "aws_launch_template" "ecs" {
  name_prefix   = "${var.project_name}-ecs-"
  image_id      = data.aws_ssm_parameter.ecs_ami.value
  instance_type = "t3.micro"

  iam_instance_profile {
    name = aws_iam_instance_profile.ecs_instance.name
  }

  vpc_security_group_ids = [aws_security_group.app.id]

  # Tells the ECS agent baked into this AMI which cluster to join, and
  # adds 1GB of swap -- this instance's 1GB RAM alone proved too tight
  # for 6 real Node.js/Prisma services running at once (confirmed live:
  # service-auth crash-looped repeatedly, consistent with the OOM
  # killer). Swap lets Linux page out idle memory instead of killing a
  # process outright when RAM is briefly tight -- slower than real RAM
  # under sustained pressure, but free, and plenty for a near-zero-
  # traffic deployment.
  user_data = base64encode(<<-EOF
    #!/bin/bash
    echo ECS_CLUSTER=${aws_ecs_cluster.main.name} >> /etc/ecs/ecs.config
    fallocate -l 1G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo "/swapfile swap swap defaults 0 0" >> /etc/fstab
  EOF
  )

  tag_specifications {
    resource_type = "instance"

    tags = {
      Name = "${var.project_name}-ecs-instance"
    }
  }
}

resource "aws_autoscaling_group" "ecs" {
  name = "${var.project_name}-ecs-asg"

  vpc_zone_identifier = aws_subnet.public[*].id

  min_size         = 1
  max_size         = 1
  desired_capacity = 1

  launch_template {
    id      = aws_launch_template.ecs.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "${var.project_name}-ecs-instance"
    propagate_at_launch = true
  }

  # Lets the ECS agent fully deregister a draining instance from the
  # cluster (stopping any tasks on it cleanly) before the ASG actually
  # terminates it -- irrelevant at min=max=1 today, but correct and
  # cheap to have in place regardless.
  protect_from_scale_in = false
}
