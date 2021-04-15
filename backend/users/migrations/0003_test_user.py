import datetime
import os

from django.db import migrations
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from pdp2.models import long_time_from_now, Pdp2ProfileSubscription
from pdp2 import pdp2


def create_test_users(apps, schema_editor):
    PaipassUser = apps.get_model('users', 'PaipassUser')
    create_pdp2_test_user(apps, PaipassUser)
    create_oauth2_test_user(apps, PaipassUser)


def create_oauth2_test_user(apps, PaipassUser):
    email = os.environ['TEST_OAUTH2_END_USER_EMAIL']
    phone_number = os.environ['PAIPASS_DEV_PHONE']
    full_name = 'test oauth2 end user'
    password = make_password(os.environ['TEST_OAUTH_PASS'])
    test_oauth2_end_user = PaipassUser \
        .objects \
        .create(email=email,
                full_name=full_name,
                phone_number=phone_number,
                password=password)
    test_oauth2_end_user.save()

    email = os.environ['TEST_OAUTH2_USER_EMAIL']
    phone_number = os.environ['PAIPASS_DEV_PHONE']
    full_name = 'test oauth2 user'
    password = make_password(os.environ['TEST_OAUTH_PASS'])
    oauth2_test_user = PaipassUser \
        .objects \
        .create(email=email,
                full_name=full_name,
                phone_number=phone_number,
                password=password)
    oauth2_test_user.save()

    PaipassApplication = apps.get_model('oauth2', 'PaipassApplication')
    client_id = os.environ['TEST_OAUTH2_CLIENT_ID']
    client_secret = os.environ['TEST_OAUTH2_CLIENT_SECRET']
    redirect_uris = r'http://localhost:9123/token/'
    client_type = 'confidential'
    authorization_grant_type = 'authorization-code'
    name = 'oauth2_test'
    skip_authorization = False
    logo_url = r'http://localhost:9123/logo.png'
    home_page_url = r'http://localhost:9123/'
    namespace = r'test'
    description = 'Test Oauth2 App'
    paipass_app = PaipassApplication \
        .objects \
        .create(user=oauth2_test_user,
                redirect_uris=redirect_uris,
                client_type=client_type,
                authorization_grant_type=authorization_grant_type,
                name=name,
                skip_authorization=skip_authorization,
                logo_url=logo_url,
                home_page_url=home_page_url,
                namespace=namespace,
                description=description,
                client_id=client_id,
                client_secret=client_secret,
                )


def create_pdp2_test_user(apps, PaipassUser):
    Pdp2Subscription = apps.get_model('pdp2', 'Pdp2ProfileSubscription')

    email = os.environ['TEST_PDP2_USER_EMAIL']
    phone_number = os.environ['PAIPASS_DEV_PHONE']
    full_name = 'test pdp2 user'
    password = make_password(os.environ['TEST_PDP2_USER_PASS'])
    pdp2_test_user = PaipassUser \
        .objects \
        .create(email=email,
                full_name=full_name,
                phone_number=phone_number,
                password=password)


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0001_initial'),
        ('users', '0002_known_users'),
        ('pdp2', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_test_users),
    ]
