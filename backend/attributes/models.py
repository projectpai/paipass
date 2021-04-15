# Stdlib
import datetime
import uuid

from django.conf import settings
# Core
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
# 3rd party
from oauth2_provider.settings import oauth2_settings


# from oauth2.models import PaipassApplication, PaipassGrant

def epoch_start():
    epoch = datetime.datetime(1970, 1, 1)
    tz_now = timezone.now()
    dt_now = datetime.datetime.now()
    return tz_now - (dt_now - epoch)


class MaxOwnerPerms(models.IntegerChoices):
    NONE = 0
    READ = 1
    READ_WRITE = 3


class Attribute(models.Model):
    class Meta:
        # application ~ namespace and since the original definitions
        # specified one namespace person app, we can use this approx.
        unique_together = ('application', 'name',)

    id = models.UUIDField(primary_key=True,
                          default=uuid.uuid4,
                          editable=False)
    application = models.ForeignKey(oauth2_settings.APPLICATION_MODEL,
                                    on_delete=models.CASCADE)
    # A description of what the key stores
    description = models.CharField(_("Description"), max_length=1024)

    # The maximum number of elements that may be stored under the key
    max_values = models.IntegerField(_("Max Values"),
                                     default=1023,
                                     validators=[MinValueValidator(0),
                                                 MaxValueValidator(1023)])

    # The maximum permissions that can be granted to owners of data elements,
    # values: NONE, READ, READ_WRITE
    max_owner_perms = models.SmallIntegerField(_("Max Owner Permissions"),
                                               choices=MaxOwnerPerms.choices,
                                               default=MaxOwnerPerms.NONE)
    # The maximum permissions that can be granted to non-owners of data elements,
    # values: NONE, READ, READ_WRITE
    max_all_perms = models.SmallIntegerField(_("Max Non-Owner Permissions"),
                                             choices=MaxOwnerPerms.choices,
                                             default=MaxOwnerPerms.NONE)
    # The name of the key consisting of one or more Segments separated by a "."
    # character. Each Segment must start with a letter, consist of the
    # characters A-z and 0-9, and be between 1 and 31 characters in length.
    # TODO: add validator
    name = models.CharField(_("Key Name"), max_length=63)

    created_on = models.DateTimeField(auto_now_add=True)

    deleted_at = models.DateTimeField(_("Deleted at"), default=epoch_start)

    label = models.CharField(_("Label"), max_length=32)
    # Whether values of this key can be modified by the user through the user
    # interface
    is_editable = models.BooleanField(_('Is Editable'), default=False)
    # Format object description below. If blank, no format validation is
    # performed.
    format_description = models.CharField(_("Description of the format"),
                                          max_length=256)
    # The regex that user-provided must match
    format_regex = models.TextField(_("Regex for formatter"))


class AllowedValue(models.Model):
    id = models.UUIDField(primary_key=True,
                          default=uuid.uuid4,
                          editable=False)

    attribute = models.ForeignKey(Attribute,
                                  on_delete=models.CASCADE)

    value = models.TextField(_("Value"))


class AttributeData(models.Model):
    id = models.UUIDField(primary_key=True,
                          default=uuid.uuid4,
                          editable=False)

    data = models.TextField()

    owning_application = models.ForeignKey(oauth2_settings.APPLICATION_MODEL,
                                           on_delete=models.CASCADE,
                                           related_name='owning_app')

    user = models.ForeignKey(settings.AUTH_USER_MODEL,
                             related_name="%(app_label)s_%(class)s",
                             on_delete=models.CASCADE)

    attr = models.ForeignKey(Attribute, on_delete=models.CASCADE)

    last_updated = models.DateTimeField(auto_now=True)


class AttributeApproval(models.Model):
    class Status(models.TextChoices):
        APPROVED = 'APPROVED', _('Approved')
        DENIED = 'DENIED', _('Denied')
        REVOKED = 'REVOKED', _('Revoked')
        PENDING = 'PENDING', _('Pending')

    status = models.CharField(max_length=8, choices=Status.choices, default=Status.PENDING)

    grant = models.ForeignKey(oauth2_settings.GRANT_MODEL, on_delete=models.CASCADE)

    requesting_app = models.ForeignKey(oauth2_settings.APPLICATION_MODEL,
                                       on_delete=models.CASCADE,
                                       related_name='attributes_requesting_app')
    # I don't like the name either but I'd rather stay consistent with the
    # language of requesting_app
    owning_app = models.ForeignKey(oauth2_settings.APPLICATION_MODEL,
                                   on_delete=models.CASCADE,
                                   related_name='attributes_owning_app')

    user = models.ForeignKey(settings.AUTH_USER_MODEL,
                             related_name="%(app_label)s_%(class)s",
                             on_delete=models.CASCADE)

    attribute = models.ForeignKey(Attribute, on_delete=models.CASCADE)

    max_perms = models.SmallIntegerField(_("Max Non-Owner Permissions"),
                                         choices=MaxOwnerPerms.choices,
                                         default=MaxOwnerPerms.NONE)
