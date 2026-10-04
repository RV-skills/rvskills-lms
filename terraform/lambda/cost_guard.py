import os

import boto3

REGION = os.environ["TARGET_REGION"]
CLUSTER = os.environ["CLUSTER"]
ASG = os.environ["ASG"]
DB = os.environ["DB"]


def handler(event, context):
    # Pass {"dry_run": true} as a test event to log what would happen
    # without changing anything.
    dry_run = bool(isinstance(event, dict) and event.get("dry_run"))

    ecs = boto3.client("ecs", region_name=REGION)
    autoscaling = boto3.client("autoscaling", region_name=REGION)
    rds = boto3.client("rds", region_name=REGION)

    services = []
    for page in ecs.get_paginator("list_services").paginate(cluster=CLUSTER):
        services += page["serviceArns"]

    for arn in services:
        print(f"{'would scale' if dry_run else 'scaling'} {arn} to 0")
        if not dry_run:
            ecs.update_service(cluster=CLUSTER, service=arn, desiredCount=0)

    print(f"{'would scale' if dry_run else 'scaling'} ASG {ASG} to 0")
    if not dry_run:
        autoscaling.update_auto_scaling_group(
            AutoScalingGroupName=ASG, MinSize=0, MaxSize=0, DesiredCapacity=0
        )

    print(f"{'would stop' if dry_run else 'stopping'} RDS {DB}")
    if not dry_run:
        try:
            rds.stop_db_instance(DBInstanceIdentifier=DB)
        except rds.exceptions.InvalidDBInstanceStateFault as e:
            print(f"RDS not stopped: {e}")
