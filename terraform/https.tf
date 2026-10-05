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
