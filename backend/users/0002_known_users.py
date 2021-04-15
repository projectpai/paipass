import os

from django.db import migrations
from django.contrib.auth.hashers import make_password


def create_known_users(apps, schema_editor):
    PaipassUser = apps.get_model('users', 'PaipassUser')
    create_docker_containers_users(PaipassUser)
    create_first_party_app_developers(apps, PaipassUser)


def create_docker_containers_users(PaipassUser):
    paicoin_email = os.environ['PAICOIN_SERVER_EMAIL']
    paicoin_pass = make_password(os.environ['PAICOIN_SERVER_PASS'])
    full_name = 'paicoin server docker container'
    phone_number = os.environ['PAIPASS_DEV_PHONE']
    paicoin_docker_container_user = PaipassUser \
        .objects \
        .create(email=paicoin_email,
                full_name=full_name,
                phone_number=phone_number,
                password=paicoin_pass)
    paicoin_docker_container_user.save()


def create_first_party_app_developers(apps, PaipassUser):
    Pdp2Subscription = apps.get_model('pdp2', 'Pdp2ProfileSubscription')

    paipass_email = os.environ['PAIPASS_DEV_EMAIL']
    paipass_pass = make_password(os.environ['PAIPASS_DEV_PASS'])
    full_name = 'paipass developer uno'
    phone_number = os.environ['PAIPASS_DEV_PHONE']
    paipass_dev_user = PaipassUser \
        .objects \
        .create(email=paipass_email,
                full_name=full_name,
                phone_number=phone_number,
                password=paipass_pass,
                is_staff=True)
    paipass_dev_user.has_verified_email = True
    paipass_dev_user.save()


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0001_initial'),
        ('pdp2', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_known_users),
    ]

