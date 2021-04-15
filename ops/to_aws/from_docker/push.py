import os
import subprocess
import time
import yaml
import json
import re

import boto3
from config import DEFAULT_CFG as push_cfg
import shlex
from dotenv import load_dotenv


# create repository
def create_ecr_repo(cfg):
    obj = {}

    for service_name, service in cfg.services.items():
        if "build" in service:
            # create repository
            ecr_repository_name = f'{cfg.aws_cfg.project.lower()}_{service_name}'
            try:
                response = client.create_repository(
                    repositoryName=ecr_repository_name,
                    tags=[
                        {
                            'Key': 'platform',
                            'Value': service_name
                        },
                    ]
                )

                ecr_uri = response['repository']['repositoryUri']
                obj[ecr_repository_name] = ecr_uri
            except Exception as e:
                return None
    return obj


def tag(cfg):
    for key, value in cfg.ecr_obj.items():
        original_tag = f'{key}:{cfg.tag}-{cfg.deployment_env}'
        new_tag = f'{value}:{cfg.tag}-{cfg.deployment_env}'
        try:
            output = subprocess.check_call(["docker", "tag", original_tag, new_tag])
        except subprocess.CalledProcessError as e:
            print(e.output)
            raise e


def push(cfg):
    for key, value in cfg.ecr_obj.items():

        new_tag = f'{value}:{cfg.tag}-{cfg.deployment_env}'
        print('new_tag', new_tag)
        push = subprocess.Popen(["docker", "push", new_tag])
        status = f"Waiting for {key} push to complete..."
        print(status)
        push.wait()
        print("Done.")


def update(service_name, service, ecr_obj):
    for key, value in ecr_obj.items():
        if service_name in key:
            del service["build"]
            service["image"] = value


def re_tag_images(cfg):
    if cfg.tag is None:
        raise Exception(f"cfg.tag cannot be None")
    tag(cfg)


def push_to_ecr(cfg):
    if cfg.tag is None:
        raise Exception(f"${cfg.tag} cannot be None")
    push(cfg)


def update_services_for_deployment(cfg):
    for service_name, service in cfg.services.items():
        service["logging"] = {
            'driver': 'awslogs',
            'options': {
                'awslogs-group': f"{cfg.aws_cfg.project}",
                'awslogs-region': f"{cfg.aws_cfg.region}",
                'awslogs-stream-prefix': f'{cfg.aws_cfg.project}-{service_name}'
            }
        }
        if "build" in service:
            update(service_name, service, cfg.ecr_obj)

        if "volumes" in service:
            del service["volumes"]


def write_yaml(output_file, yaml_out):
    with open(output_file, "w") as out_file:
        yaml.safe_dump(yaml_out, out_file, default_flow_style=False)

    # yaml that is produced is a bit buggy.
    with open(output_file, "r+") as fh:
        lines = map(lambda a: re.sub(r"^\s{4}-", "      -", a), fh.readlines())

    with open(output_file, "w") as f:
        f.writelines(lines)

    return lines


# Write the new docker-compose.yml file.
def create_deploy_docker_compose_file(cfg):
    write_yaml(cfg.output_file_deploy, cfg.stack)
    print("Wrote new compose file.")
    print(f"COMPOSE_FILE={cfg.output_file_deploy}")


def build_exists(cfg, container_name):
    cmd = f"docker inspect --type=image {cfg.aws_cfg.project}_{container_name}:{cfg.tag}-{cfg.deployment_env}"
    try:
        output = subprocess.check_output(shlex.split(cmd)).decode()
    except subprocess.CalledProcessError as e:
        return False

    jout = json.loads(output)
    return len(jout) > 0


def build(cfg):
    for container_name in cfg.aws_cfg.container_names:
        exists = build_exists(cfg, container_name)
        if not cfg.rebuild and exists:
            continue
        if cfg.rebuild and exists:
            pre_cmd = f"docker-compose" \
                      f" -f {cfg.output_file_build}" \
                      f" --project-directory  {cfg.paipass_dir}" \
                      f" --env-file {cfg.con_env_cfg.env_file}" \
                      f" build"
            cmd = pre_cmd + ' ' + container_name

            print(cmd + '\n' * 5, flush=True)
            try:
                output = subprocess.check_output(shlex.split(cmd))
            except subprocess.CalledProcessError as e:
                print(e)
                raise e

            else:
                print(output.decode())
        elif cfg.rebuild and not exists:
            pre_cmd = f"docker build"
            if 'build' in cfg.services[container_name] and 'args' in cfg.services[container_name]['build']:
                for arg in cfg.services[container_name]['build']['args']:
                    if "${" in arg:
                        arg_resolved = ""
                        var_init = arg.split('=')[0]
                        for request_var_i in arg.split('${')[1:]:
                            request_var_i = request_var_i.split('}')[0]
                            resolved_var = os.getenv(request_var_i)
                            arg_resolved += resolved_var
                        arg = var_init + '=' + arg_resolved
                    pre_cmd += f' --build-arg {arg}'
            pre_cmd += ' '
            cmd = pre_cmd + ' -t ' + f'{cfg.aws_cfg.project}_{container_name}:{cfg.tag}-{cfg.deployment_env}'
            cmd += f' {os.path.join(cfg.paipass_dir, cfg.services[container_name]["build"]["context"])}'
            cmd += '/.'
            print(cmd)
            try:
                output = subprocess.check_output(shlex.split(cmd))
            except subprocess.CalledProcessError as e:
                print(e)
                raise e


def update_services_for_build_step(cfg):
    for service_name, service in cfg.services.items():
        if 'image' not in service:
            nombre = f'{cfg.aws_cfg.project}_{service_name}:{cfg.tag}-{cfg.deployment_env}'
            service['image'] = nombre
            service['container_name'] = nombre.split(':')[0]
            print(service['image'])


def create_build_docker_compose_file(cfg):
    write_yaml(cfg.output_file_build, cfg.stack)
    print("Wrote new compose file.")
    print(f"COMPOSE_FILE={cfg.output_file_build}")


def run(cfg):
    update_services_for_build_step(cfg)
    create_build_docker_compose_file(cfg)
    build(cfg)
    # res = create_ecr_repo(cfg)
    re_tag_images(cfg)
    push_to_ecr(cfg)
    update_services_for_deployment(cfg)

    create_deploy_docker_compose_file(cfg)


if __name__ == '__main__':
    import argparse

    # underscores are for refactoring needs (specifically, to make old stuff break due to new names).

    _deployment_env = 'staging'
    _docker_tag_name = 'provenance'
    # use if repository exist
    push_cfg.tag = _docker_tag_name
    push_cfg.deployment_env = _deployment_env
    push_cfg.rebuild = True
    client = boto3.client('ecr',
                          region_name=push_cfg.aws_cfg.region,
                          aws_access_key_id=push_cfg.aws_cfg.access_key,
                          aws_secret_access_key=push_cfg.aws_cfg.secret_access_key, )

    # Generate version number for build
    _version = str(int(time.time()))

    _alt_input = f"docker-compose.{push_cfg.deployment_env}.yml"
    _alt_output_deploy = f"docker-compose.{push_cfg.deployment_env}.deploy.yml-{_version}"
    _alt_output_build = f"docker-compose.{push_cfg.deployment_env}.build.yml-{_version}"

    _input_file = os.environ.get("DOCKER_COMPOSE_YML_INPUT", _alt_input)
    _output_file_deploy = os.environ.get("DOCKER_COMPOSE_YML_OUTPUT_DEPLOY", _alt_output_deploy)
    _output_file_build = os.environ.get("DOCKER_COMPOSE_YML_OUTPUT_BUILD", _alt_output_build)

    if _input_file == _output_file_deploy == _output_file_build == "docker-compose.yml":
        print("I will not clobber your docker-compose.yml file.")
        print("Please unset DOCKER_COMPOSE_YML or set it to something else.")
        exit(1)

    push_cfg.input_file = _input_file
    push_cfg.output_file_deploy = _output_file_deploy
    push_cfg.output_file_build = os.path.abspath(_output_file_build)

    with open(_input_file) as f:
        _stack = yaml.safe_load(f)
    push_cfg.stack = _stack
    push_cfg.services = _stack["services"]

    parser = argparse.ArgumentParser()
    parser.add_argument('--dep-env')
    parser.add_argument('--env-file')
    parser.add_argument('--tag')
    args = parser.parse_args(f'--dep-env staging '
                             f' --env-file ~/paipass/env_files/staging.env '
                             f' --tag {push_cfg.tag}'.split())

    push_cfg.con_env_cfg.env_file = os.path.expanduser(args.env_file)
    # load env file into system so that os.getenv works
    load_dotenv(push_cfg.con_env_cfg.env_file)
    # update_task_def('backend', push_cfg.deployment_env, push_cfg.con_env_cfg.env_file)
    push_cfg
    run(push_cfg)
