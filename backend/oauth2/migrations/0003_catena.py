from django.conf import settings
import os
from attributes.models import MaxOwnerPerms

from django.db import migrations


def create_pai_forum_app(apps, schema_editor):
    PaipassApplication = apps.get_model('oauth2', 'PaipassApplication')
    Attribute = apps.get_model('attributes', 'Attribute')
    AllowedValue = apps.get_model('attributes', 'AllowedValue')

    PaipassUser = apps.get_model('users', 'PaipassUser')
    paicoin_email = os.environ['PAIPASS_DEV_EMAIL']
    paipass_dev_user = PaipassUser.objects.all() \
        .get(email=paicoin_email)
    # Non existent uri
    redirect_uris = settings.BASE_URL_CATENA + 'users/login-token/'
    client_type = 'confidential'
    authorization_grant_type = 'authorization-code'
    name = 'Catena'
    skip_authorization = False
    # TODO where is the logo located???
    logo_url = 'https://blackhole:8000/logo.png'
    home_page_url = settings.BASE_URL_PAIFORUM
    namespace = 'Catena'
    description = 'Catena is an Art Gallery within the PAI Ecosystem'
    app = PaipassApplication \
        .objects \
        .create(user=paipass_dev_user,
                redirect_uris=redirect_uris,
                client_type=client_type,
                authorization_grant_type=authorization_grant_type,
                name=name,
                skip_authorization=skip_authorization,
                logo_url=logo_url,
                home_page_url=home_page_url,
                namespace=namespace,
                description=description,
                id=settings.CATENA_UUID,
                client_id=settings.CATENA_CLIENT_ID,
                client_secret=settings.CATENA_APP_CLIENT_SECRET, )

    app.save()
    # Account type attribute
    perm_descr = 'This permission gives the requestor the ability to see your Catena account type.'
    attr = Attribute.objects.create(name='AccountType',
                                    application=app,
                                    max_owner_perms=MaxOwnerPerms.READ_WRITE.value,
                                    max_all_perms=MaxOwnerPerms.READ.value,
                                    is_editable=False,
                                    description=perm_descr,
                                    max_values=1
                                    )
    AllowedValue.objects.create(attribute=attr,
                                value='Collector')
    AllowedValue.objects.create(attribute=attr,
                                value='Artist')

    return app


class Migration(migrations.Migration):
    dependencies = [
        ('oauth2', '0002_known_apps'),
    ]

    operations = [
        migrations.RunPython(create_pai_forum_app),
    ]
