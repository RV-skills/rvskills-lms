# Automatic spend guard: when cumulative gross spend (credits excluded)
# passes the limit below, scale everything to zero so the account does
# not burn through its AWS credits.
#
# The SNS topics and the Lambda live in us-east-1, where Budgets
# notification setups are normally done; the Lambda acts on this
# project's resources in the main region through boto3.
#
# To undo a shutdown: run terraform apply (restores the ECS and ASG
# counts) and start the RDS instance by hand. A stopped RDS instance
# also restarts by itself after 7 days.

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

locals {
  cost_guard_limit_usd = "140"

  budget_topics = {
    warn     = aws_sns_topic.budget_warn.arn
    shutdown = aws_sns_topic.budget_shutdown.arn
  }
}

resource "aws_sns_topic" "budget_warn" {
  provider = aws.us_east_1
  name     = "${var.project_name}-budget-warn"
}

resource "aws_sns_topic" "budget_shutdown" {
  provider = aws.us_east_1
  name     = "${var.project_name}-budget-shutdown"
}

resource "aws_sns_topic_policy" "budgets" {
  for_each = local.budget_topics
  provider = aws.us_east_1
  arn      = each.value

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AWSBudgetsSNSPublishingPermissions"
      Effect    = "Allow"
      Principal = { Service = "budgets.amazonaws.com" }
      Action    = "SNS:Publish"
      Resource  = each.value
      Condition = {
        StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }
        ArnLike      = { "aws:SourceArn" = "arn:aws:budgets::${data.aws_caller_identity.current.account_id}:*" }
      }
    }]
  })
}

# Yearly period so it accumulates across the whole credit lifetime (a
# monthly budget would reset every month). Credits and refunds are
# excluded so it tracks gross usage, which is what the credits absorb.
resource "aws_budgets_budget" "credit_guard" {
  name         = "${var.project_name}-credit-guard"
  budget_type  = "COST"
  limit_amount = local.cost_guard_limit_usd
  limit_unit   = "USD"
  time_unit    = "ANNUALLY"

  cost_types {
    include_credit = false
    include_refund = false
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 70
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_sns_topic_arns = [aws_sns_topic.budget_warn.arn]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_sns_topic_arns = [aws_sns_topic.budget_shutdown.arn]
  }

  depends_on = [aws_sns_topic_policy.budgets]
}

data "archive_file" "cost_guard" {
  type        = "zip"
  source_file = "${path.module}/lambda/cost_guard.py"
  output_path = "${path.module}/.cost_guard.zip"
}

resource "aws_iam_role" "cost_guard" {
  name = "${var.project_name}-cost-guard"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "cost_guard_logs" {
  role       = aws_iam_role.cost_guard.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "cost_guard" {
  name = "${var.project_name}-cost-guard"
  role = aws_iam_role.cost_guard.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ecs:ListServices"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["ecs:UpdateService"]
        Resource = "arn:aws:ecs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:service/${aws_ecs_cluster.main.name}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["autoscaling:UpdateAutoScalingGroup"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["rds:StopDBInstance"]
        Resource = aws_db_instance.main.arn
      },
    ]
  })
}

resource "aws_lambda_function" "cost_guard" {
  provider         = aws.us_east_1
  function_name    = "${var.project_name}-cost-guard"
  role             = aws_iam_role.cost_guard.arn
  runtime          = "python3.12"
  handler          = "cost_guard.handler"
  filename         = data.archive_file.cost_guard.output_path
  source_code_hash = data.archive_file.cost_guard.output_base64sha256
  timeout          = 60

  environment {
    variables = {
      TARGET_REGION = var.aws_region
      CLUSTER       = aws_ecs_cluster.main.name
      ASG           = aws_autoscaling_group.ecs.name
      DB            = aws_db_instance.main.identifier
    }
  }
}

resource "aws_lambda_permission" "from_sns" {
  provider      = aws.us_east_1
  statement_id  = "AllowSNSInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cost_guard.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.budget_shutdown.arn
}

resource "aws_sns_topic_subscription" "shutdown_lambda" {
  provider  = aws.us_east_1
  topic_arn = aws_sns_topic.budget_shutdown.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.cost_guard.arn
}
