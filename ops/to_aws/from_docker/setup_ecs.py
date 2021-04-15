import boto3
import pprint

pp = pprint.PrettyPrinter(indent=4)


class SetupNetwork:

    def __init__(self, cfg):
        self.elb = boto3.client('elb',
                                region_name=cfg.aws_cfg.region,
                                aws_access_key_id=cfg.aws_cfg.access_key,
                                aws_secret_access_key=cfg.aws_cfg.secret_access_key,
                                )
        self.ec2 = boto3.client('ec2',
                                region_name=cfg.aws_cfg.region,
                                aws_access_key_id=cfg.aws_cfg.access_key,
                                aws_secret_access_key=cfg.aws_cfg.secret_access_key, )
        self.cfg = cfg

    def load_balancer_exists(self):
        return False

    def create_load_balancer(self):
        # if not self.load_balancer_exists():
        #    self.elb.create_load_balancer()
        pass

    def get_vpcs(self, vpc_name):
        response = self.ec2.describe_vpcs(Filters=[
            {
                'Name': 'tag:Name',
                'Values': [
                    vpc_name
                ]
            }
        ])
        vpcs = response['Vpcs']
        return vpcs

    def vpc_exists(self, vpc_name):
        vpcs = self.get_vpcs(vpc_name)
        for vpc in vpcs:
            for tag in vpc['Tags']:
                if tag['Key'] == 'Name' and tag['Value'] == vpc_name:
                    return True
        return False

    def create_vpc(self, vpc_name):
        response = self.ec2.create_vpc(CidrBlock='10.0.0.0/16',
                                       TagSpecifications=[
                                           {
                                               # Why.... why is this required?
                                               'ResourceType': 'vpc',
                                               'Tags': [
                                                   {
                                                       'Key': 'Name',
                                                       'Value': vpc_name,
                                                   }
                                               ]

                                           }
                                       ]
                                       )
        return response['Vpc']['VpcId']

    def subnet_exists(self, subnet):
        response = self.ec2.describe_subnets(
            Filters=[
                {'Name': 'tag:Name',
                 'Values': [
                     subnet['name']
                 ]
                 }

            ]
        )
        subnets = response['Subnets']
        for subnet_i in subnets:
            for tag in subnet_i['Tags']:
                if tag['Key'] == 'Name' and tag['Value'] == subnet['name']:
                    return True
        return False

    def create_subnet(self, subnet):
        response = self.ec2.create_subnet(
            TagSpecifications=[
                {'ResourceType': 'subnet',
                 'Tags': [
                     {'Key': 'Name',
                      'Value': subnet['name']}
                 ]}],
            AvailabilityZone=subnet['az'],
            CidrBlock=subnet['cidr_block'],
            VpcId=self.cfg.aws_cfg.aws_net_cfg.vpc_id,
        )
        return response

    def set_vpc_id(self, vpc_name):
        vpcs = self.get_vpcs(vpc_name)
        for vpc in vpcs:
            for tag in vpc['Tags']:
                if tag['Key'] == 'Name' and tag['Value'] == vpc_name:
                    self.cfg.aws_cfg.aws_net_cfg.vpc_id = vpc['VpcId']
                    return True
        return False

    def create_network(self):
        vpc_name = self.cfg.aws_cfg.aws_net_cfg.vpc_name
        if not self.vpc_exists(vpc_name):
            print(f'Vpc {self.cfg.aws_cfg.aws_net_cfg.vpc_name} does not exist... Creating...')
            vpc_id = self.create_vpc(vpc_name)
            self.cfg.aws_cfg.aws_net_cfg.vpc_id = vpc_id
        else:
            self.set_vpc_id(vpc_name)
            print(f'Vpc {self.cfg.aws_cfg.aws_net_cfg.vpc_name} exists with id:\n'
                  f'\t{self.cfg.aws_cfg.aws_net_cfg.vpc_id}')
        subnets = self.cfg.aws_cfg.aws_net_cfg.subnets
        for subnet in subnets:
            if not self.subnet_exists(subnet):
                self.create_subnet(subnet)
            else:
                pass
        print()

    def create_service_discovery(self):
        pass

    def setup(self):
        self.create_network()
        self.create_load_balancer()


class SetupEcs:
    def __init__(self, cfg):
        self.iam = boto3.client('iam',
                                region_name=cfg.aws_cfg.region,
                                aws_access_key_id=cfg.aws_cfg.access_key,
                                aws_secret_access_key=cfg.aws_cfg.secret_access_key,
                                )
        self.ecs = boto3.client('ecs',
                                region_name=cfg.aws_cfg.region,
                                aws_access_key_id=cfg.aws_cfg.access_key,
                                aws_secret_access_key=cfg.aws_cfg.secret_access_key, )
        self.cfg = cfg

    def role_exists(self, role_name):
        try:
            self.iam.get_role(RoleName=role_name, )
        except self.iam.NoSuchEntityException:
            return False
        return True

    def role_policy_exists(self, role_name, role_policy):
        try:
            self.iam.get_role_policy(RoleName=role_name,
                                     PolicyName=role_policy)
        except self.iam.NoSuchEntityException:
            return False
        return True

    def cluster_exists(self, cluster_name):
        response = self.ecs.list_clusters(maxResults=100)
        clusters = response['clusterArns']
        while len(clusters) > 0:
            response = self.ecs.describe_clusters(clusters=clusters)
            cluster_descriptions = response['clusters']
            print(cluster_descriptions)
            for description in cluster_descriptions:
                if description['clusterName'] == cluster_name:
                    return True
            if 'nextToken' in response:
                response = self.ecs.list_clusters(maxResults=100, nextToken=response['nextToken'])
                clusters = response['clusterArns']
            else:
                clusters = []
        return False

    def service_exists(self, service_name, cluster_name):
        response = self.ecs.list_services(cluster=cluster_name,
                                          maxResults=100)
        services = response['serviceArns']
        while len(services) > 0:
            response = self.ecs.describe_services(cluster=cluster_name, services=services)
            service_descriptions = response['services']
            print(service_descriptions)
            for description in service_descriptions:
                if description['serviceName'] == service_name:
                    return True
            if 'nextToken' in response:
                response = self.ecs.list_clusters(maxResults=100, nextToken=response['nextToken'])
                services = response['serviceArns']
            else:
                services = []
        return False

    def setup(self):
        if False and not self.role_exists(self.cfg.aws_cfg.role_name):
            print(f'Role {self.cfg.aws_cfg.role_name} does not exist... Creating...')
            self.iam.create_role(RoleName=self.cfg.aws_cfg.role_name,
                                 AssumeRolePolicyDocument=self.cfg.aws_cfg.role_policy_doc,
                                 )
        if False and not self.role_policy_exists(self.cfg.role_name, self.cfg.role_policy):
            print(f'Role Policy {self.cfg.aws_cfg.role_policy_arn} does not exist... Creating...')
            self.iam.attach_role_policy(RoleName=self.cfg.aws_cfg.role_name,
                                        PolicyArn=self.cfg.aws_cfg.role_policy_arn,
                                        )
            return
        if False and not self.cluster_exists(self.cfg.aws_cfg.cluster_name):
            print(f'Cluster {self.cfg.aws_cfg.cluster_name} does not exist... Creating...')
            self.ecs.create_cluster(clusterName=self.cfg.aws_cfg.cluster_name,
                                    capacityProviders=['FARGATE'])

        for service_name in self.cfg.aws_cfg.service_names:
            if not self.service_exists(service_name, self.cfg.aws_cfg.cluster_name):
                print(f'Service {service_name} does not exist... Creating...')


if __name__ == '__main__':
    from config import DEFAULT_CFG as push_cfg

    sn = SetupNetwork(push_cfg)
    sn.setup()

    # se = SetupEcs(push_cfg)
    # se.setup()
