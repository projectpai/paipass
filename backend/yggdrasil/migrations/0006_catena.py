import os

from django.contrib.auth import get_user_model
from django.db import migrations
from django.conf import settings
from yggdrasil.models import FieldDataTypeChoices
from django.contrib.auth import get_user_model


def create_known_schema(apps, schema_editor):
    Schema = apps.get_model('yggdrasil', 'Schema')
    ShareGroup = apps.get_model('yggdrasil', 'ShareGroup')
    Field = apps.get_model('yggdrasil', 'Field')
    PaipassUser = apps.get_model('users', 'PaipassUser')
    create_paichain_info_supplychain_schema(Schema, ShareGroup, Field, PaipassUser)


def create_paichain_info_supplychain_schema(Schema, ShareGroup, Field, PaipassUser):
    user = PaipassUser.objects.all().get(email=os.environ['PAIPASS_DEV_EMAIL'])

    sg = ShareGroup.objects.create(owner=user,
                                   everyone=False)

    sc = Schema.objects.create(share_group=sg,
                               name='Catena Assets',
                               id=os.environ['CATENA_SCHEMA_ASSET_UUID'])
    Field.objects.create(schema=sc,
                         name="Name",
                         data_type=FieldDataTypeChoices.TEXT)

    Field.objects.create(schema=sc,
                         name="Asset Owner",
                         data_type=FieldDataTypeChoices.TEXT)

    Field.objects.create(schema=sc,
                         name="Asset Poster",
                         data_type=FieldDataTypeChoices.TEXT)

    Field.objects.create(schema=sc,
                         name="Artist",
                         data_type=FieldDataTypeChoices.TEXT)

    Field.objects.create(schema=sc,
                         name="Description",
                         data_type=FieldDataTypeChoices.TEXT)

    Field.objects.create(schema=sc,
                         name="Price",
                         data_type=FieldDataTypeChoices.TEXT)

    Field.objects.create(schema=sc,
                         name="Price Units",
                         data_type=FieldDataTypeChoices.TEXT)

    Field.objects.create(schema=sc,
                         name='Main Thumbnail',
                         data_type=FieldDataTypeChoices.IMAGE)

    images = Field.objects.create(schema=sc,
                                  name="Images",
                                  data_type=FieldDataTypeChoices.LIST)

    Field.objects.create(schema=sc,
                         name="Image",
                         data_type=FieldDataTypeChoices.IMAGE,
                         group=images)

    timeline_events = Field.objects.create(schema=sc,
                                           name="Timeline Events",
                                           data_type=FieldDataTypeChoices.LIST)

    timeline_event = Field.objects.create(schema=sc,
                                          name="Timeline Event",
                                          data_type=FieldDataTypeChoices.OBJECT,
                                          group=timeline_events)
    Field.objects.create(schema=sc,
                         name="Event Name",
                         data_type=FieldDataTypeChoices.TEXT,
                         group=timeline_event)

    Field.objects.create(schema=sc,
                         name="Blockchain Address",
                         data_type=FieldDataTypeChoices.TEXT,
                         group=timeline_event)

    Field.objects.create(schema=sc,
                         name="Timestamp",
                         data_type=FieldDataTypeChoices.DATE,
                         group=timeline_event)


class Migration(migrations.Migration):
    dependencies = [
        ('yggdrasil', '0005_auto_20201104_0213'),
    ]

    operations = [
        migrations.RunPython(create_known_schema),
    ]
