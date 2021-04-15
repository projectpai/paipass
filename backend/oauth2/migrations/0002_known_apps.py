import os

from django.contrib.auth import get_user_model
from django.db import migrations
from django.contrib.auth.hashers import make_password
from django.conf import settings
from attributes import attributes
from attributes.models import MaxOwnerPerms


def create_known_apps(apps, schema_editor):

    PaipassApplication = apps.get_model('oauth2', 'PaipassApplication')
    PaipassUser = apps.get_model('users', 'PaipassUser')
    Attribute =  apps.get_model('attributes', 'Attribute')
    create_first_party_apps(PaipassApplication, PaipassUser, Attribute)
    convert_current_users_to_paipass_app()
    link_user_changes_to_attrs_changes()

def convert_current_users_to_paipass_app():
    User = get_user_model()
    for user in User.objects.all():
        attributes.save_user_data_in_paipass_app_attributes(sender=User,
                                                            instance=user,
                                                            created=True)

def link_user_changes_to_attrs_changes():
    from django.db.models.signals import post_save
    post_save.connect(attributes.save_user_data_in_paipass_app_attributes, sender=get_user_model())


def create_first_party_apps(PaipassApplication, PaipassUser, Attribute):
    intrinsic_paipass_app = create_paipass_app(PaipassApplication, PaipassUser, Attribute)
    discourse_app = create_pai_forum_app(PaipassApplication, PaipassUser, Attribute)


def create_pai_forum_app(PaipassApplication, PaipassUser, Attribute):
    paicoin_email = os.environ['PAIPASS_DEV_EMAIL']
    paipass_dev_user = PaipassUser.objects.all() \
        .get(email=paicoin_email)
    # Non existent uri
    redirect_uris = settings.BASE_URL_PAIFORUM + 'auth/oauth2_basic/callback'
    client_type = 'confidential'
    authorization_grant_type = 'authorization-code'
    name = 'PAI Forum'
    skip_authorization = False
    # TODO where is the logo located???
    logo_url = 'https://blackhole:8000/logo.png'
    home_page_url = settings.BASE_URL_PAIFORUM
    namespace = 'PaiForum'
    description = 'PAI Forum is a forum to discuss the PAI ecosystem.'
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
                id=settings.PAIFORUM_UUID,
                client_id=settings.PAIFORUM_CLIENT_ID,
                client_secret=settings.PAIFORUM_APP_CLIENT_SECRET,)

    app.save()
    '''
    prefix = 'This permission gives the requestor the ability to see your '
    for field in attributes.SALIENT_FIELDS:
        attr = Attribute.objects.create(name=field.oauth_name.upper(),
                                        application=app,
                                        max_owner_perms=MaxOwnerPerms.READ_WRITE.value,
                                        max_all_perms=MaxOwnerPerms.READ.value,
                                        is_editable=True,
                                        description=f'{prefix} {field.oauth_name}',
                                        max_values=1)
        attr.save()
    '''

    return app

def create_paipass_app(PaipassApplication, PaipassUser, Attribute):
    paicoin_email = os.environ['PAIPASS_DEV_EMAIL']
    paipass_dev_user = PaipassUser.objects.all() \
        .get(email=paicoin_email)
    # Non existent uri
    redirect_uris = 'https://blackhole:8000/token'
    client_type = 'confidential'
    authorization_grant_type = 'authorization-code'
    name = 'PaiPass'
    skip_authorization = False
    logo_url = 'https://blackhole:8000/logo.png'
    home_page_url = 'https://blackhole:8000/'
    namespace = 'PaiPass'
    description = 'PaiPass'
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
                id=os.environ['PAIPASS_DEV_APP_UUID'])

    app.save()

    prefix = 'This permission gives the requestor the ability to see your '
    for field in attributes.SALIENT_FIELDS:
        attr = Attribute.objects.create(name=field.oauth_name.upper(),
                                        application=app,
                                        max_owner_perms=MaxOwnerPerms.READ_WRITE.value,
                                        max_all_perms=MaxOwnerPerms.READ.value,
                                        is_editable=False,
                                        description=f'{prefix} {field.oauth_name}',
                                        max_values=1)
        attr.save()


    return app

def create_attribute(Attribute, **kwargs):
    attr = Attribute.objects.create(**kwargs)
    attr.save()


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_test_user'),
        ('pdp2', '0001_initial'),
        ('oauth2', '0001_initial')
    ]

    operations = [
        migrations.RunPython(create_known_apps),
    ]
