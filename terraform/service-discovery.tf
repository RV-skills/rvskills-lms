# A private DNS namespace, only resolvable from inside this VPC. Each
# internal backend service (not the gateway or web -- those are reached
# through the ALB, not internal DNS) gets a name like
# service-auth.rvskills.internal, which the gateway's own
# SERVICE_AUTH_URL-style env vars point at instead of localhost.
resource "aws_service_discovery_private_dns_namespace" "internal" {
  name = "${var.project_name}.internal"
  vpc  = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-internal-dns"
  }
}

locals {
  internal_services = [
    "service-auth",
    "service-courses",
    "service-enrollment",
    "service-assessment",
  ]
}

# No health_check_custom_config here: that setting tells Cloud Map to
# expect manual health status updates via a separate API call that
# nothing in this architecture ever sends, which can leave a registered
# instance stuck "unhealthy" from Cloud Map's own perspective even
# while its ECS task is genuinely running fine -- found live, as the
# real cause of the gateway's "Failed to reach
# http://service-auth.rvskills.internal:3001" errors. ECS's own Cloud
# Map integration (the service_registries block on each ECS service)
# handles registration and deregistration automatically as tasks
# start and stop; no custom health signal is needed for that.
resource "aws_service_discovery_service" "internal" {
  for_each = toset(local.internal_services)

  name = each.value

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.internal.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  tags = {
    Name = "${var.project_name}-${each.value}-discovery"
  }
}
