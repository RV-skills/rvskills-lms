output "vpc_id" {
  description = "ID of the VPC."
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets (load balancer, NAT gateway)."
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets (ECS tasks, RDS)."
  value       = aws_subnet.private[*].id
}

output "db_endpoint" {
  description = "RDS Postgres endpoint (host:port)."
  value       = aws_db_instance.main.endpoint
}

output "db_master_user_secret_arn" {
  description = "ARN of the Secrets Manager secret holding the RDS master credentials, managed directly by AWS."
  value       = aws_db_instance.main.master_user_secret[0].secret_arn
}

output "app_security_group_id" {
  description = "Security group every ECS task attaches to."
  value       = aws_security_group.app.id
}

output "ecr_repository_urls" {
  description = "ECR repository URL for each service, keyed by service name."
  value       = { for name, repo in aws_ecr_repository.services : name => repo.repository_url }
}

output "ecs_execution_role_arn" {
  description = "IAM role ARN ECS uses to run a task (pull image, write logs, read secrets)."
  value       = aws_iam_role.ecs_execution.arn
}

output "ecs_task_role_arn" {
  description = "IAM role ARN the running application itself assumes."
  value       = aws_iam_role.ecs_task.arn
}
