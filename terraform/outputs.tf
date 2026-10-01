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

output "jwt_private_key_secret_arn" {
  description = "ARN of the Secrets Manager secret holding the JWT private key."
  value       = aws_secretsmanager_secret.jwt_private_key.arn
}

output "jwt_public_key_secret_arn" {
  description = "ARN of the Secrets Manager secret holding the JWT public key."
  value       = aws_secretsmanager_secret.jwt_public_key.arn
}

output "cookie_secret_arn" {
  description = "ARN of the Secrets Manager secret holding the cookie signing secret."
  value       = aws_secretsmanager_secret.cookie_secret.arn
}

output "alb_dns_name" {
  description = "Public DNS name of the load balancer. Point a real domain's CNAME/ALIAS at this."
  value       = aws_lb.main.dns_name
}

output "web_target_group_arn" {
  description = "Target group ARN the web ECS service registers with."
  value       = aws_lb_target_group.web.arn
}

output "gateway_target_group_arn" {
  description = "Target group ARN the gateway ECS service registers with."
  value       = aws_lb_target_group.gateway.arn
}

output "ecs_cluster_id" {
  description = "ECS cluster ID, needed once task definitions/services exist."
  value       = aws_ecs_cluster.main.id
}

output "cloudwatch_log_group_names" {
  description = "CloudWatch log group name for each service, keyed by service name."
  value       = { for name, lg in aws_cloudwatch_log_group.services : name => lg.name }
}

output "internal_service_discovery_arns" {
  description = "Cloud Map service discovery ARN for each internal backend service, keyed by service name. Used by that service's own ECS service to register with Cloud Map."
  value       = { for name, svc in aws_service_discovery_service.internal : name => svc.arn }
}

output "internal_dns_namespace" {
  description = "The private DNS suffix internal services are reachable at, e.g. service-auth.<this>."
  value       = aws_service_discovery_private_dns_namespace.internal.name
}
