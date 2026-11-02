# Course videos and files: a private S3 bucket served through CloudFront.
#
# Nothing in the bucket is public. CloudFront reads it through an origin access
# control, and only serves a file when the link carries a valid signature from the
# key below. The gateway signs links for lessons the student may open, and they
# expire after a few hours (VIDEO_LINK_TTL_MINUTES on the gateway).
#
# The bucket was first created by hand from CloudShell to start copying videos,
# so it is imported here rather than created.

locals {
  video_bucket_name = "${var.project_name}-videos-${data.aws_caller_identity.current.account_id}"
}

import {
  to = aws_s3_bucket.videos
  id = local.video_bucket_name
}

resource "aws_s3_bucket" "videos" {
  bucket = local.video_bucket_name

  # Holds the licensed course library: never delete it from Terraform by mistake.
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_public_access_block" "videos" {
  bucket                  = aws_s3_bucket.videos.id
  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "videos" {
  bucket = aws_s3_bucket.videos.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "videos" {
  bucket = aws_s3_bucket.videos.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Only this CloudFront distribution may read the files.
resource "aws_s3_bucket_policy" "videos" {
  bucket = aws_s3_bucket.videos.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontRead"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.videos.arn}/*"
      Condition = {
        StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.videos.arn }
      }
    }]
  })

  depends_on = [aws_s3_bucket_public_access_block.videos]
}

# Key used to sign video links. The private half goes to the gateway through SSM;
# like the JWT key, it is also in Terraform state (see secrets.tf).
resource "tls_private_key" "cloudfront_signing" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "aws_ssm_parameter" "cloudfront_private_key" {
  name  = "/${var.project_name}/cloudfront-private-key"
  type  = "SecureString"
  value = tls_private_key.cloudfront_signing.private_key_pem
}

resource "aws_cloudfront_public_key" "videos" {
  name        = "${var.project_name}-video-signing"
  comment     = "Verifies signed links made by the gateway"
  encoded_key = tls_private_key.cloudfront_signing.public_key_pem
}

resource "aws_cloudfront_key_group" "videos" {
  name  = "${var.project_name}-video-signing"
  items = [aws_cloudfront_public_key.videos.id]
}

resource "aws_cloudfront_origin_access_control" "videos" {
  name                              = "${var.project_name}-videos"
  description                       = "CloudFront access to the private video bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}

# The PDF viewer fetches files from the page's own scripts, so it needs CORS headers.
data "aws_cloudfront_response_headers_policy" "cors" {
  name = "Managed-SimpleCORS"
}

# PriceClass_200 covers North America, Europe, Asia (incl. India), the Middle East and Africa.
resource "aws_cloudfront_distribution" "videos" {
  enabled         = true
  comment         = "${var.project_name} course videos and files (signed links only)"
  is_ipv6_enabled = true
  http_version    = "http2and3"
  price_class     = "PriceClass_200"

  origin {
    origin_id                = "videos-s3"
    domain_name              = aws_s3_bucket.videos.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.videos.id
  }

  default_cache_behavior {
    target_origin_id           = "videos-s3"
    viewer_protocol_policy     = "https-only"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = false
    cache_policy_id            = data.aws_cloudfront_cache_policy.optimized.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.cors.id
    trusted_key_groups         = [aws_cloudfront_key_group.videos.id]
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
