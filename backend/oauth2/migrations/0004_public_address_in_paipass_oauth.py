from django.conf import settings
import os
from attributes.models import MaxOwnerPerms

from django.db import migrations


def add_public_address_to_paipass(apps, schema_editor):
    PaipassApplication = apps.get_model('oauth2', 'PaipassApplication')
    Attribute = apps.get_model('attributes', 'Attribute')
    paipass = PaipassApplication.objects.all().get(name='PaiPass')
    description = 'This permission gives the requestor the ability to see your PAICoin Address'
    # this will probably just be a placeholder.
    attr = Attribute.objects.create(name='PAICoin_Address',
                                    application=paipass,
                                    max_owner_perms=MaxOwnerPerms.READ_WRITE.value,
                                    max_all_perms=MaxOwnerPerms.READ.value,
                                    is_editable=True,
                                    description=description,
                                    max_values=1)
    attr.save()


class Migration(migrations.Migration):
    dependencies = [
        ('oauth2', '0003_catena'),
    ]

    operations = [
        migrations.RunPython(add_public_address_to_paipass),
    ]
