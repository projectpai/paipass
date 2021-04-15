import os
import subprocess
import time
import yaml
import configparser

import re

import boto3
import pprint
from tabulate import tabulate


pp = pprint.PrettyPrinter(indent=4)
# subprocess.check_call(["aws", "ecr", "get-login", ""])





# create repository
def create_ecr_repo(services):
    obj = {}

    for service_name, service in services.items():
        if "build" in service:
            # create repository
            ecr_repository_name = f'{PROJECT.lower()}_{service_name}'
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


def tag(ecr_repo_obj, with_tag):
    for key, value in ecr_repo_obj.items():
        original_tag = f'{key}:{with_tag}'
        new_tag = f'{value}:{with_tag}-{DEPLOYMENT_ENV}'
        subprocess.check_call(["docker", "tag", original_tag, new_tag])


def push(ecr_repo_obj, with_tag):
    for key, value in ecr_repo_obj.items():
        new_tag = f'{value}:{with_tag}-{DEPLOYMENT_ENV}'
        push = subprocess.Popen(["docker", "push", new_tag])
        status = f"Waiting for {key} push.py to complete..."
        print(status)
        push.wait()
        print("Done.")


def update(service_name, service, ecr_repo_obj):
    for key, value in ecr_repo_obj.items():
        if service_name in key:
            del service["build"]
            service["image"] = value


def re_tag_images(ecr_repo_obj=None, with_tag=None):
    if ecr_repo_obj is None:
        ecr_repo_obj = ECR_REPO_OBJ
    if with_tag is None:
        raise Exception(f"${with_tag} cannot be None")
    tag(ecr_repo_obj, with_tag)


def push_to_ecr(ecr_repo_obj=None, with_tag=None):
    if ecr_repo_obj is None:
        ecr_repo_obj = ECR_REPO_OBJ
    if with_tag is None:
        raise Exception(f"${with_tag} cannot be None")
    push(ECR_REPO_OBJ, with_tag=with_tag)


def update_services(ecr_repo_obj=None):
    # Replace the "build" definition by an "image" definition,
    # using the name of the image on ECR.
    global services
    if ecr_repo_obj is None:
        ecr_repo_obj = ECR_REPO_OBJ

    for service_name, service in services.items():
        service["logging"] = {
            'driver': 'awslogs',
            'options': {
                'awslogs-group': f"{PROJECT}",
                'awslogs-region': f"{REGION}",
                'awslogs-stream-prefix': f'{PROJECT}-{service_name}'
            }
        }
        if "build" in service:
            update(service_name, service, ecr_repo_obj)

        if "volumes" in service:
            del service["volumes"]


# Write the new docker-compose.yml file.
def create_deploy_docker_compose_file(output_file):
    with open(output_file, "w") as out_file:
        yaml.safe_dump(stack, out_file, default_flow_style=False)

    # yaml that is produced is a bit buggy.
    fh = open(output_file, "r+")
    lines = map(lambda a: re.sub(r"^\s{4}-", "      -", a), fh.readlines())
    fh.close()
    with open(output_file, "w") as f:
        f.writelines(lines)

    print("Wrote new compose file.")
    print(f"COMPOSE_FILE={output_file}")


def run(dep_env, with_tag):
    res = create_ecr_repo(services)
    re_tag_images(res, with_tag)
    push_to_ecr(res, with_tag)
    update_services(res)

    create_deploy_docker_compose_file(output_file)


def env_subst(env_path, task_name):
    # I think we can safely assume that wherever the docker-compose.yml is, the accompanying .env is adjacent
    env_file = configparser.ConfigParser(interpolation=None)
    s = "[env]\n"
    with open(env_path, 'r') as f:
        for line in f:
            s += line
    env_file.read_string(s)
    env_vars = env_file['env']
    env_vars = dict(env_vars.items())
    dckr_yml_env = stack['services'][task_name]['environment']
    env_vars_out = {}
    for key, val in dckr_yml_env.items():
        env_var = val[2:-1].lower()
        print(env_var)
        if env_var.lower() not in env_vars:
            raise Exception(f"Env Var {env_var} was not found in {env_path}")
        env_vars_out[key.upper()] = env_vars[env_var]
    return env_vars_out


def get_yn_user_input(msg, err_mg):


    r = float('-inf')

    def not_recognized_input(r):
        r != 'y' or r != 'n'

    while not_recognized_input(r):
        r = input(msg)
        if not_recognized_input(r):
            print(err_mg%r)
    return r

def update_missing_vars(actual_env_vars, expected_env_vars):
    act_diff_exp = set(actual_env_vars.keys()).symmetric_difference(set(expected_env_vars.keys()))

    user_input = None
    answers = {}

    for var in act_diff_exp:
        actual = actual_env_vars[var]
        expected = expected_env_vars[var]
        s = f"For the env. var. {var}, the value in the task definition is {actual} whereas the value" \
            f" locally is {expected}. Would you like to change the task definition to match the local " \
            f" environment? (y,n,ya)"
        s_e = "Input %s not recognized; choices are, y, ya, & n."
        if user_input is None:
            user_input = get_yn_user_input(s, s_e)
        if user_input == 'y' or user_input == 'ya':
            answers[var] = expected_env_vars[var]
        if user_input != 'ya':
            user_input = None
    if len(answers):
        t = tabulate({"Var Name": act_diff_exp,
                      "Old": actual[act_diff_exp],
                      "Update": answers[act_diff_exp]})
        print(t)
        if get_yn_user_input("") == 'y':
            return answers
        else:
            return update_missing_vars(actual_env_vars, expected_env_vars)
    else:
        print("No missing vars found...")

def update_task_def(task_name, dep_env, env_path):
    print(f'Using the local env file located at {env_path}')

    ecs_client = boto3.client('ecs')
    tds_arns = ecs_client.list_task_definitions(familyPrefix=task_name)['taskDefinitionArns']
    if len(tds_arns) < 1:
        return None
    latest_td_arn = None
    highest_rev = float('-inf')
    for td_arn in tds_arns:
        rev = int(td_arn.split(':')[-1])
        if rev > highest_rev:
            highest_rev = rev
            latest_td_arn = td_arn
    task_def_description = ecs_client.describe_task_definition(taskDefinition=latest_td_arn)
    pp.pprint(task_def_description)
    container_defs = task_def_description['taskDefinition']['containerDefinitions']
    if len(container_defs) > 1:
        raise Exception(f'The len of container defs should be 1 but it is {len(container_defs)}')
    container_def = container_defs[0]
    actual_env_vars = {}
    for d_i in container_def['environment']:
        items = list(d_i.items())
        key = items[0][1]
        value = items[1][1]
        actual_env_vars[key] = value

    expected_env_vars = env_subst(env_path, task_name)
    expected_env_vars = update_missing_vars(actual_env_vars, expected_env_vars)


def substitute(path, dep_env):
    pass


if __name__ == '__main__':
    import argparse

    ID = os.getenv('AWS_ACCOUNT_ID', 'your_AWS_id')
    REGION = os.getenv('AWS_REGION', 'your_aws_region')
    PROJECT = os.getenv('AWS_PROJECT', 'your_aws_project')
    ACCESS_KEY = os.getenv('AWS_ACCESS_KEY', None)
    SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY', None)

    DEPLOYMENT_ENV = 'staging'
    docker_tag_name = 'supply_chain_alpha'
    # use if repository exist
    FRONTEND_REPOSITORY_URI = f'{ID}.dkr.ecr.{REGION}.amazonaws.com/{PROJECT}_frontend'
    # BACKEND_REPOSITORY_URI = f'{ID}.dkr.ecr.{REGION}.amazonaws.com/{PROJECT}_backend'
    # ADMIN_REPOSITORY_URI = f'{ID}.dkr.ecr.{REGION}.amazonaws.com/{PROJECT}_admin'
    # PAICOIN_REPOSITORY_URI = f'{ID}.dkr.ecr.{REGION}.amazonaws.com/{PROJECT}_paicoin'
    # TORRENT_CLIENT_REPOSITORY_URI = f'{ID}.dkr.ecr.{REGION}.amazonaws.com/{PROJECT}_torrent_client'
    # TORRENT_TRACKER_REPOSITORY_URI = f'{ID}.dkr.ecr.{REGION}.amazonaws.com/{PROJECT}_torrent_tracker'

    ECR_REPO_OBJ = {
        f"{PROJECT}_frontend": FRONTEND_REPOSITORY_URI,
        # f"{PROJECT}_backend": BACKEND_REPOSITORY_URI,
        # f"{PROJECT}_admin": ADMIN_REPOSITORY_URI,
        # f"{PROJECT}_paicoin": PAICOIN_REPOSITORY_URI,
        # f"{PROJECT}_torrent_client": TORRENT_CLIENT_REPOSITORY_URI,
        # f"{PROJECT}_torrent_tracker": TORRENT_TRACKER_REPOSITORY_URI,
    }

    client = boto3.client('ecr',
                          region_name=REGION,
                          aws_access_key_id=ACCESS_KEY,
                          aws_secret_access_key=SECRET_ACCESS_KEY,

                          )

    push_operations = dict()

    # Generate version number for build
    version = str(int(time.time()))

    alt_input = f"docker-compose.{DEPLOYMENT_ENV}.yml"
    alt_output = f"docker-compose.{DEPLOYMENT_ENV}.build.yml-{version}"

    input_file = os.environ.get("DOCKER_COMPOSE_YML_INPUT", alt_input)
    output_file = os.environ.get("DOCKER_COMPOSE_YML_OUTPUT", alt_output)

    if input_file == output_file == "docker-compose.yml":
        print("I will not clobber your docker-compose.yml file.")
        print("Please unset DOCKER_COMPOSE_YML or set it to something else.")
        exit(1)

    stack = yaml.safe_load(open(input_file))
    services = stack["services"]

    parser = argparse.ArgumentParser()
    parser.add_argument('--dep-env')
    parser.add_argument('--env-file')
    parser.add_argument('--tag')
    args = parser.parse_args(f'--dep-env staging --env-file ../env_files/staging.env --tag {docker_tag_name}'.split())

    #update_task_def('backend', args.dep_env, args.env_file)
    run(args.env_file, args.tag)
