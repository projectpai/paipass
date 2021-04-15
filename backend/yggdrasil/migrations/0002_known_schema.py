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
                                   everyone=True)

    sc = Schema.objects.create(share_group=sg,
                               name='Supply Chain')

    Field.objects.create(schema=sc,
                         name="Title",
                         data_type=FieldDataTypeChoices.TEXT)

    Field.objects.create(schema=sc,
                         name="Description",
                         data_type=FieldDataTypeChoices.TEXT)

    Field.objects.create(schema=sc,
                         name="Type",
                         data_type=FieldDataTypeChoices.TEXT)

    ingredients = Field.objects.create(schema=sc,
                                       name="Ingredients",
                                       data_type=FieldDataTypeChoices.LIST)

    Field.objects.create(schema=sc,
                         name="Ingredient",
                         data_type=FieldDataTypeChoices.TEXT,
                         group=ingredients)

    Field.objects.create(schema=sc,
                         name="Manufacturer",
                         data_type=FieldDataTypeChoices.TEXT)

    Field.objects.create(schema=sc,
                         name="Batch Number",
                         data_type=FieldDataTypeChoices.INTEGER)

    Field.objects.create(schema=sc,
                         name="Country of Origin",
                         data_type=FieldDataTypeChoices.TEXT)

    Field.objects.create(schema=sc,
                         name="Expiration Date",
                         data_type=FieldDataTypeChoices.DATE)

    Field.objects.create(schema=sc,
                         name="Primary Image",
                         data_type=FieldDataTypeChoices.TEXT)

    Field.objects.create(schema=sc,
                         name="Secondary Image",
                         data_type=FieldDataTypeChoices.TEXT)

    Field.objects.create(schema=sc,
                         name="QR Code",
                         data_type=FieldDataTypeChoices.TEXT)

    Field.objects.create(schema=sc,
                         name="Secondary Image Title",
                         data_type=FieldDataTypeChoices.TEXT)

    verified_properties = Field.objects.create(schema=sc,
                                               name="Verified Properties",
                                               data_type=FieldDataTypeChoices.LIST)

    Field.objects.create(schema=sc,
                         name="Verified Property",
                         data_type=FieldDataTypeChoices.TEXT,
                         group=verified_properties)

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
                         name="Timestamp",
                         data_type=FieldDataTypeChoices.DATE,
                         group=timeline_event)


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0003_test_user'),
        ('yggdrasil', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_known_schema),
    ]
