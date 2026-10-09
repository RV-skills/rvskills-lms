#!/usr/bin/env bash
# Runs a command inside the running service-auth container on the ECS instance, using
# SSM Run Command, then prints its output. The container already has database access.
# Usage: run-in-service-auth.sh "<command to run inside the container>"
set -euo pipefail

COMMAND="$1"
ASG_NAME="rvskills-ecs-asg"

INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:aws:autoscaling:groupName,Values=$ASG_NAME" "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)

if [ -z "$INSTANCE_ID" ] || [ "$INSTANCE_ID" = "None" ]; then
  echo "::error::No running instance found in $ASG_NAME"
  exit 1
fi

# ECS labels each container with its name, so this finds service-auth whatever Docker called it.
SHELL_LINE="CONTAINER=\$(docker ps -q --filter label=com.amazonaws.ecs.container-name=service-auth | head -n1); \
[ -n \"\$CONTAINER\" ] || { echo 'service-auth container is not running'; exit 1; }; \
docker exec \"\$CONTAINER\" $COMMAND"

PARAMS=$(jq -n --arg line "$SHELL_LINE" '{commands: [$line]}')

COMMAND_ID=$(aws ssm send-command \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --comment "GitHub Actions: ${GITHUB_WORKFLOW:-manual}" \
  --parameters "$PARAMS" \
  --query 'Command.CommandId' --output text)

# The wait fails if the command failed; carry on so its output is still shown.
aws ssm wait command-executed --command-id "$COMMAND_ID" --instance-id "$INSTANCE_ID" || true

invocation() {
  aws ssm get-command-invocation --command-id "$COMMAND_ID" --instance-id "$INSTANCE_ID" --query "$1" --output text
}

echo "--- output ---"
invocation StandardOutputContent
echo "--- errors ---"
invocation StandardErrorContent

STATUS=$(invocation Status)
if [ "$STATUS" != "Success" ]; then
  echo "::error::Command finished with status $STATUS"
  exit 1
fi
