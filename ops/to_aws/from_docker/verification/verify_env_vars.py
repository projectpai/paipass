import configparser
from tabulate import tabulate
import boto3

import pprint
pp = pprint.PrettyPrinter(indent=4)


def env_subst(cfg, env_path, task_name):
    # I think we can safely assume that wherever the docker-compose.yml is, the accompanying .env is adjacent
    env_file = configparser.ConfigParser(interpolation=None)
    s = "[env]\n"
    with open(env_path, 'r') as f:
        for line in f:
            s += line
    env_file.read_string(s)
    env_vars = env_file['env']
    env_vars = dict(env_vars.items())
    dckr_yml_env = cfg.services[task_name]['environment']
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
            print(err_mg % r)
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


def update_task_def(cfg, task_name, dep_env, env_path):
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

    expected_env_vars = env_subst(cfg, env_path, task_name)
    expected_env_vars = update_missing_vars(actual_env_vars, expected_env_vars)


def substitute(path, dep_env):
    pass
