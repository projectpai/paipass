import os
from collections import namedtuple

from django.contrib.auth import get_user_model
from pdp2 import pdp2
from attributes.models import (Attribute, AttributeData, MaxOwnerPerms)
from oauth2.models import PaipassApplication
from oauth2.oauth2 import scope_expression_to_symbols
from core.blockchain.projectpai.paicoin import paicoin_cli
from django.conf import settings


def get_attribute(request, scope, attr_requesting_app_id):
    rw, namespace, name = scope_expression_to_symbols(scope)
    # if name.lower() == 'sso':
    #     name = 'email'

    attr_owner_app = PaipassApplication.objects.all().get(namespace__iexact=namespace)
    attr = Attribute.objects.all().get(application=attr_owner_app,
                                       name__iexact=name)
    rw_enum = convert_to_enum_perms(rw)
    # If they are the same
    if attr_requesting_app_id == attr_owner_app.client_id:
        return attr
    elif rw_enum.value == MaxOwnerPerms.NONE.value:
        return None
    elif rw_enum.value > attr.max_all_perms:
        return None
    return attr


def convert_to_enum_perms(perm):
    if 'read' in perm.lower() and 'write' not in perm.lower():
        return MaxOwnerPerms.READ
    elif 'write' in perm.lower():
        return MaxOwnerPerms.READ_WRITE
    else:
        return MaxOwnerPerms.NONE


def convert_from_enum_perms(perm):
    if MaxOwnerPerms.READ == perm:
        return 'READ'
    elif MaxOwnerPerms.READ_WRITE == perm:
        return 'READ_WRITE'
    else:
        return 'NONE'


class PaipassDevAppCachedWrapper:

    def __init__(self):
        self.paipass_dev_app = None
        self.attrs = {}

    def init(self):
        self.paipass_dev_app = PaipassApplication.objects.get(id=os.environ['PAIPASS_DEV_APP_UUID'])
        for field in SALIENT_FIELDS:
            self.attrs[field.oauth_name] = Attribute.objects.all().get(application=self.paipass_dev_app,
                                                                       name__iexact=field.oauth_name)


paipass_dev_app_wrapper = PaipassDevAppCachedWrapper()

SalientField = namedtuple('SalientField', ('user_db_name', 'oauth_name'))

email = SalientField(user_db_name='email', oauth_name='email')
sso = SalientField(user_db_name='sso', oauth_name='sso')
phone_number = SalientField(user_db_name='phone_number', oauth_name='phone')
name = SalientField(user_db_name='full_name', oauth_name='name')

SALIENT_FIELDS = (email, phone_number, name, sso)

prefix = 'This permission gives the requestor the ability to see your '


def save_user_data_in_paipass_app_attributes(sender, instance, created=False, **kwargs):
    print('\n' * 8, flush=True)
    '''
    if isinstance(sender, get_user_model()):
        print('SENDING USER SAVE SIGNAL...')
        update_attr_assoc_w_user_data(sender, instance, created, **kwargs)
    else:
        print(f'SENDING {type(sender)} NOWHERE...')
    '''
    print('SENDING USER SAVE SIGNAL to attributes app...')
    print(instance.full_name)
    update_attr_assoc_w_user_data(sender, instance, created, **kwargs)
    print('\n' * 8, flush=True)


def get_paipass_dev_app(**kwargs):
    paipass_dev_app = None
    if 'paipass_app' in kwargs:
        paipass_dev_app = kwargs['paipass_app']
    elif paipass_dev_app_wrapper.paipass_dev_app is None:
        paipass_dev_app_wrapper.init()
        paipass_dev_app = paipass_dev_app_wrapper.paipass_dev_app
    paipass_dev_app_wrapper.init()
    paipass_dev_app = paipass_dev_app_wrapper.paipass_dev_app
    return paipass_dev_app


def create_attribute_datum(user, attr_name):
    attr_data = None
    # Nothing fancy; for now, just check if it's something Paipass should know about.
    paipass_dev_app = get_paipass_dev_app()
    for field in SALIENT_FIELDS:
        if attr_name.lower() == field.oauth_name.lower() and field.user_db_name.lower() != 'sso':
            attr_data = AttributeData.objects.create(attr=paipass_dev_app_wrapper.attrs[field.oauth_name],
                                                     owning_application=paipass_dev_app,
                                                     user=user,
                                                     data=getattr(user, field.user_db_name))
            attr_data.save()
    return attr_data


def retrieve_user_from_datum(attr, owning_app, data):
    qs = AttributeData.objects.all().filter(attr=attr,
                                            data=data,
                                            owning_application=owning_app)
    if qs.count() > 0:
        return qs.first().user
    else:
        return None

# TODO This is  ridiculous; separate into two functions
def create_or_retrieve_attribute_datum(user, attr, owning_app, id=None):
    expandable = dict(user=user,
                      attr=attr,
                      owning_application=owning_app)

    if id is not None:
        expandable['id'] = id

    # TODO Double check that this access_token has access to this data.
    qs = AttributeData.objects.all().filter(**expandable)

    # The point of this is to generate a paicoin address if none can
    # be found to be associated with a user.
    if qs.count() < 1 and attr.name.upper() == 'PAICOIN_ADDRESS':
        expandable['data'] = paicoin_cli.get_new_wallet_address(settings.CRYPTO_URL)
        ad = AttributeData.objects.create(**expandable)
        return ad

    if qs.count() > 0:
        return qs.first()

    return create_attribute_datum(user, attr.name)


def update_attr_assoc_w_user_data(sender, user, created, **kwargs):
    # TODO From a cursory glance, this makes no sense! It doesn't seem to
    #  make sense to update data in two places (i.e. in the oauth2 tables
    #  and the user tables)

    if created:
        for field in SALIENT_FIELDS:
            print('field', field, flush=True)
            attr_data = create_attribute_datum(user, field.oauth_name)

    else:
        paipass_dev_app = get_paipass_dev_app(**kwargs)
        for field in SALIENT_FIELDS:
            attr = Attribute.objects.all().get(name=field.oauth_name,
                                               application=paipass_dev_app)
            attr_data = AttributeData.objects.all().get(attr=attr,
                                                        owning_application=paipass_dev_app,
                                                        user=user)
            og_data = getattr(attr_data, field.oauth_name)
            current_data = getattr(user, field.user_db_name)
            if og_data != current_data:
                setattr(attr_data, field.oauth_name, current_data)
                attr_data.save()


def get_user_as_paicoin_addr(user):
    PAIPASS_APP = PaipassApplication.objects.all().get(namespace__iexact='paipass')
    PAI_ADDR_ATTR = Attribute.objects.all().get(application=PAIPASS_APP,
                                                name__iexact='paicoin_address')
    ad_qs = AttributeData.objects.all().filter(user=user,
                                               attr=PAI_ADDR_ATTR,
                                               owning_application=PAIPASS_APP)
    if ad_qs.count() > 0:
        return ad_qs.first().data
    return None
