import os
from dataclasses import dataclass
from typing import Iterable

DEFAULT_NAME_PREFIX = 'PaiPass Staging Redux'


@dataclass
class AwsNetCfg:
    vpc_name: str = DEFAULT_NAME_PREFIX + ' VPC'
    subnets: Iterable[dict] = None


@dataclass
class AwsCfg:
    aws_net_cfg: AwsNetCfg = None

    id: str = None
    region: str = None
    project: str = None
    access_key: str = None
    secret_access_key: str = None
    container_names: list = None
    role_name: str = None
    role_policy_arn: str = 'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy'
    role_policy_doc: str = 'file://task-execution-assume-role.json'
    cluster_name: str = DEFAULT_NAME_PREFIX
    service_names: Iterable = ()


@dataclass
class ContainerEnvCfg:
    env_file: str = None


@dataclass
class PushCfg:
    aws_cfg: AwsCfg = None
    con_env_cfg: ContainerEnvCfg = None
    ecr_obj: dict = None

    paipass_dir: str = None
    deployment_env: str = None
    tag: str = None
    services: dict = None
    output_file_deploy: str = None
    output_file_build: str = None
    input_file: str = None
    stack: dict = None
    rebuild: bool = False


def get_ecr_repo_obj(aws_cfg):
    ecr_repo_obj = {}

    for container_name in aws_cfg.container_names:
        key = f"{aws_cfg.project}_{container_name}"
        val = f'{aws_cfg.id}.dkr.ecr.{aws_cfg.region}.amazonaws.com/{aws_cfg.project}_{container_name}'
        ecr_repo_obj[key] = val

    return ecr_repo_obj


aws_account_id = os.getenv('AWS_ACCOUNT_ID', 'your_AWS_id')
region = os.getenv('AWS_REGION', 'your_aws_region')
project = os.getenv('AWS_PROJECT', 'your_aws_project')
role_name = os.getenv('ROLE_NAME', 'your_aws_project')
paipass_dir = os.getenv('PAIPASS_DIRECTORY', os.path.expanduser('~/paipass'))

container_names = [
    #'frontend',
    'backend',
    # 'admin',
    #'paicoin',
    # 'torrent_client',
    # 'torrent_tracker'
]

DEFAULT_AWS_NET_CFG = AwsNetCfg(subnets=({'name': f'{DEFAULT_NAME_PREFIX} Subnet us-east-2a',
                                          'az': 'us-east-2a',
                                          'azid': 'use2-az1',
                                          'cidr_block': '10.0.1.0/24'},
                                         {'name': f'{DEFAULT_NAME_PREFIX} Subnet us-east-2b',
                                          'az': 'us-east-2b',
                                          'azid': 'use2-az2',
                                          'cidr_block': '10.0.2.0/24'}
                                         ))

DEFAULT_AWS_CFG = AwsCfg(aws_net_cfg=DEFAULT_AWS_NET_CFG,
                         id=aws_account_id,
                         region=region,
                         project=project,
                         access_key=os.getenv('AWS_ACCESS_KEY', None),
                         secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY', None),
                         role_name=role_name,
                         container_names=container_names,
                         service_names=container_names,
                         )

DEFAULT_CON_ENV_CFG = ContainerEnvCfg()

DEFAULT_CFG = PushCfg(aws_cfg=DEFAULT_AWS_CFG,
                      con_env_cfg=DEFAULT_CON_ENV_CFG,
                      paipass_dir=paipass_dir,
                      deployment_env=None,
                      tag=None,
                      ecr_obj=get_ecr_repo_obj(DEFAULT_AWS_CFG),

                      )
