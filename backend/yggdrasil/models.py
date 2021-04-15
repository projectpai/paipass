import uuid
import os

from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class StorageProviderChoices(models.TextChoices):
    S3 = _("S3"), "S3"
    PDP2 = _("PDP2"), "PDP2"


class Schema(models.Model):
    class Meta:
        unique_together = ('share_group', 'name')

    id = models.UUIDField(primary_key=True,
                          default=uuid.uuid4,
                          editable=False)

    share_group = models.ForeignKey('yggdrasil.ShareGroup',
                                    null=False,
                                    blank=False,
                                    on_delete=models.CASCADE)

    name = models.CharField(max_length=64)

    storage_provider = models.CharField(_("Storage Provider"),
                                        max_length=32,
                                        default=StorageProviderChoices.PDP2,
                                        choices=StorageProviderChoices.choices)

    # Determines whether this template comes up when the user wants to create another dataset
    reusable = models.BooleanField(default=False)

    date_created = models.DateTimeField(auto_now_add=True)


class FieldDataTypeChoices(models.TextChoices):
    TEXT = _("Text"), "TEXT"
    DATE = _("Date"), "DATE"
    OBJECT = _("Object"), "OBJECT"
    LIST = _("List"), "LIST"
    FILE = _("File"), "FILE"
    IMAGE = _("Image"), "IMAGE"
    VIDEO = _("Video"), "VIDEO"
    INTEGER = _("Integer"), "INTEGER"


class Field(models.Model):
    class Meta:
        unique_together = ('schema', 'name')

    schema = models.ForeignKey(Schema, null=False,
                               blank=False,
                               on_delete=models.CASCADE)

    name = models.CharField(max_length=128)

    data_type = models.CharField(max_length=64,
                                 default=FieldDataTypeChoices.TEXT,
                                 choices=FieldDataTypeChoices.choices)

    # if it is null, this means it's a member of the schema rather than a member of
    group = models.ForeignKey("self",
                              null=True,
                              blank=True,
                              on_delete=models.CASCADE)

    def __str__(self):
        return f'{self.name}=>{self.data_type} '


class ShareGroup(models.Model):
    id = models.UUIDField(primary_key=True,
                          default=uuid.uuid4,
                          editable=False)

    owner = models.ForeignKey(settings.AUTH_USER_MODEL,
                              related_name="%(app_label)s_%(class)s",
                              null=False,
                              blank=False,
                              on_delete=models.CASCADE)

    active = models.BooleanField(default=True)

    everyone = models.BooleanField(default=False)


class UserShareGroup(models.Model):
    share_group = models.ForeignKey(ShareGroup,
                                    null=False,
                                    blank=False,
                                    on_delete=models.CASCADE)

    user = models.ForeignKey(settings.AUTH_USER_MODEL,
                             related_name="%(app_label)s_%(class)s",
                             null=False,
                             blank=False,
                             on_delete=models.CASCADE)


class DatasetWatchTypeChoices(models.TextChoices):
    PDP2 = _("Pdp2"), "PDP2"


class Dataset(models.Model):
    id = models.UUIDField(primary_key=True,
                          default=uuid.uuid4,
                          editable=False)

    schema = models.ForeignKey(Schema, null=False,
                               blank=False,
                               on_delete=models.CASCADE)

    share_group = models.ForeignKey(ShareGroup, null=False,
                                    blank=False,
                                    on_delete=models.CASCADE)

    date_created = models.DateTimeField(auto_now_add=True)

    watched_by = models.CharField(_("Watched By"),
                                  null=True,
                                  blank=True,
                                  max_length=64,
                                  choices=DatasetWatchTypeChoices.choices)


def upload_to_fn(instance, fname):
    return os.path.join(settings.DEPLOYMENT_ENV + '/yggdrasil/' + str(uuid.uuid4()) + '/', fname)


class Data(models.Model):
    # This is not a good idea because a field of type array can have many values.
    # class Meta:
    #     unique_together = ('dataset', 'field')

    dataset = models.ForeignKey(Dataset, null=False,
                                blank=False,
                                on_delete=models.CASCADE)

    field = models.ForeignKey(Field, null=False,
                              blank=False,
                              on_delete=models.CASCADE)
    data_file = models.FileField(_('File corresponding to yggdrasil data'),
                                 upload_to=upload_to_fn,
                                 null=True)
    value = models.TextField(_('Value'))

    private = models.BooleanField(_("Private"), default=False)

    date_created = models.DateTimeField(auto_now_add=True)
