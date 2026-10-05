# HTTPS for the custom domain. The ALB terminates TLS with a free ACM
# certificate; the services behind it keep speaking plain HTTP inside the VPC.
#
# Done in two applies on purpose. This file only requests the certificate and
# prints the DNS record that proves we own the domain. Someone with access to the
# domain's DNS has to add that record before ACM will issue the certificate, and
# a listener cannot use a certificate that is not issued yet.

variable "domain_name" {
  description = "Public hostname the app is served from."
  type        = string
  default     = "lms1.rv-skills.com"
}

resource "aws_acm_certificate" "main" {
  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.project_name}-cert"
  }
}

output "acm_validation_records" {
  description = "DNS record to add so ACM can verify domain ownership."
  value = [
    for o in aws_acm_certificate.main.domain_validation_options : {
      name  = o.resource_record_name
      type  = o.resource_record_type
      value = o.resource_record_value
    }
  ]
}

# Stage 2: waits until the certificate is actually issued, then serves HTTPS.
resource "aws_acm_certificate_validation" "main" {
  certificate_arn = aws_acm_certificate.main.arn
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.main.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web.arn
  }
}

resource "aws_lb_listener_rule" "api_https" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

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

# Sends every plain-HTTP request to HTTPS. Priority 1 outranks the older
# /api/* rule on the HTTP listener, so nothing is served over HTTP anymore.
resource "aws_lb_listener_rule" "http_redirect" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 1

  action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  condition {
    path_pattern {
      values = ["/*"]
    }
  }
}
