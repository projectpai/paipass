import uuid

from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from oauth2_provider.models import (AbstractApplication,
                                    AbstractAccessToken,
                                    AbstractGrant,
                                    AbstractRefreshToken)
from oauth2_provider.settings import oauth2_settings

from attributes.models import Attribute, MaxOwnerPerms


# Maybe status isn't necessary? I'm almost sure this is handled by the grant.
class StatusChoices(models.TextChoices):
    APPROVED = "APPROVED", _("APPROVED")
    DENIED = "DENIED", _("DENIED")


class PaipassApplication(AbstractApplication):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # TODO: Put URL validator here
    logo_url = models.CharField(_("logo url"), max_length=1024)
    # TODO: Put URL validator here
    home_page_url = models.CharField(_("home page url"), max_length=1024)
    # redirect_url = models.CharField(_("redirect url"), max_length=1024,
    #                                blank=False)
    namespace_validator = RegexValidator(regex='^.{4,32}$',
                                         message='Length must be between 4-32 characters',
                                         code='nomatch')
    namespace = models.CharField(_("namespace"), max_length=128,
                                 blank=False, unique=True,
                                 validators=[namespace_validator])
    description = models.TextField(_('description'), blank=False,
                                   null=False, max_length=1024)


class NoScopeHere(Exception):
    pass


class PaipassAccessToken(AbstractAccessToken ):
    PAIPASS_NAMESPACE = "PAIPASS"

    # TODO Refactor... the prefixed language used by the og java code wasn't
    # super clear.
    READ_ALL_SSO = "READ_ALL." + PAIPASS_NAMESPACE + ".SSO"
    RW_ATTRIBUTES = "READ_WRITE_ALL." + PAIPASS_NAMESPACE + '.ATTRIBUTES'
    READ_ALL_PHONE = "READ_ALL." + PAIPASS_NAMESPACE + ".PHONE"
    READ_ALL_NAME = "READ_ALL." + PAIPASS_NAMESPACE + ".NAME"
    READ_ALL_EMAIL = "READ_ALL." + PAIPASS_NAMESPACE + ".EMAIL"
    '''
    SCOPE_CHOICES = ((READ_ALL_SSO,_("Read All SSO")),
                     (RW_ATTRIBUTES, _("Read Write Attributes")),
                     (READ_ALL_PHONE, _("Read All Phone")),
                     (READ_ALL_NAME, _("Read All Name")),
                     (READ_ALL_EMAIL, _("Read All Email")))
    scope = models.CharField(_("scope"), max_length=128, blank=False,
                             choices=SCOPE_CHOICES)
    '''

    # scope = models.ForeignKey(Attribute, on_delete=models.CASCADE)

    @property
    def scope(self):
        raise NoScopeHere("Paipass Access Tokens don't have scopes directly attached to them")

    @scope.setter
    def scope(self):
        raise NoScopeHere("Paipass Access Tokens don't have scopes directly attached to them")


class AccessTokenScopes(models.Model):
    class Meta:
        unique_together = ('access_token', 'attribute')

    access_token = models.ForeignKey(PaipassAccessToken, on_delete=models.CASCADE)
    attribute = models.ForeignKey(Attribute, on_delete=models.CASCADE)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="%(app_label)s_%(class)s"
    )
    status = models.CharField(_("status"), max_length=32, blank=False,
                              choices=StatusChoices.choices,
                              default=StatusChoices.DENIED)
    max_perms = models.SmallIntegerField(_("Max Non-Owner Permissions"),
                                         choices=MaxOwnerPerms.choices,
                                         default=MaxOwnerPerms.NONE)


class PaipassGrant(AbstractGrant):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="%(app_label)s_%(class)s"
    )
    code = models.CharField(max_length=255, unique=True)  # code comes from oauthlib
    application = models.ForeignKey(
        oauth2_settings.APPLICATION_MODEL, on_delete=models.CASCADE
    )
    expires = models.DateTimeField()
    redirect_uri = models.CharField(max_length=255)

    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def is_expired(self):
        """
        Check token expiration with timezone awareness
        """
        if not self.expires:
            return True

        return timezone.now() >= self.expires

    def redirect_uri_allowed(self, uri):
        return uri == self.redirect_uri

    def __str__(self):
        return self.code


class PaipassRefreshToken(AbstractRefreshToken):
    placeholder = 'placeholder'
