import uuid
import datetime


from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.utils import timezone


def long_time_from_now():
    # 100 years from now seems far more than sufficient for this code to be
    # dead
    long_time = timezone.now() + datetime.timedelta(weeks=52*100)
    return long_time

#TODO find the commonality between all these "sessions" and make a base
# class for them.
class SecondFactorAuthSession(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="%(app_label)s_%(class)s",
        null=False, blank=False, on_delete=models.CASCADE
    )

    encoded_code = models.CharField(_("encoded code"), max_length=128,
                                    null=False, blank=False)

    created_on = models.DateTimeField(auto_now_add=True)
    verified_on = models.DateTimeField()
    exchanged_on = models.DateTimeField()

    @property
    def phone_number(self):
        self.user.phone_number


class PhoneVerifStatusChoices(models.TextChoices):
    ACCEPTED =  _("Accepted"), "ACCEPTED"
    PENDING = _("Pending"), "PENDING"
    CANCELLED = _("Cancelled"), "CANCELLED"

class PhoneVerificationSession(models.Model):
    id = models.UUIDField(primary_key=True,
                          default=uuid.uuid4,
                          editable=False)


    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="%(app_label)s_%(class)s",
        null=False, blank=False, on_delete=models.CASCADE
    )

    phone_number = models.CharField(_('phone number'), max_length=31)

    status = models.CharField(_("status"), max_length=32,
                              default=PhoneVerifStatusChoices.PENDING,
                              choices=PhoneVerifStatusChoices.choices)
    # https://stackoverflow.com/questions/1076714
    ip_address = models.CharField(_("ip address"), max_length=64,
                                    blank=False, null=False)

    created_on = models.DateTimeField(auto_now_add=True)
    verified_on = models.DateTimeField(default=long_time_from_now)

    verification_code = models.CharField(_("Verification Code"),
                                         max_length=128, blank=False,
                                         null=False)

class EmailVerifStatusChoices(models.TextChoices):
    ACCEPTED =  _("Accepted"), "ACCEPTED"
    PENDING = _("Pending"), "PENDING"
    CANCELLED = _("Cancelled"), "CANCELLED"

class EmailVerificationSession(models.Model):

    id = models.UUIDField(primary_key=True,
                          default=uuid.uuid4,
                          editable=False)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="%(app_label)s_%(class)s",
        null=False, blank=False, on_delete=models.CASCADE
    )

    email = models.EmailField(_('email address'), unique=True)


    status = models.CharField(_("status"), max_length=32,
                              default=EmailVerifStatusChoices.CANCELLED,
                              choices=EmailVerifStatusChoices.choices)

    # https://stackoverflow.com/questions/1076714
    ip_address = models.CharField(_("ip address"), max_length=64,
                                    blank=False, null=False)

    created_on = models.DateTimeField(auto_now_add=True)
    verified_on = models.DateTimeField(default=long_time_from_now)

    verification_code = models.CharField(_("Verification Code"),
                                         max_length=128, blank=False,
                                         null=False)


class ResetPasswordSession(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,

        related_name="%(app_label)s_%(class)s",
        null=False, blank=False, on_delete=models.CASCADE
    )

    second_factor_auth_sess = models.ForeignKey(SecondFactorAuthSession,
                                                on_delete=models.CASCADE)

    STATUS_CHOICES = (("ACCEPTED", _("Accepted")),
                       ("PENDING", _("Pending")),
                       ("CANCELLED", _("Cancelled")))
    status = models.CharField(_("status"), max_length=32,
                              default=STATUS_CHOICES[1][0],
                              choices=STATUS_CHOICES)
    # https://stackoverflow.com/questions/1076714
    ip_address = models.CharField(_("ip address"), max_length=64,
                                    blank=False, null=False)

    created_on = models.DateTimeField(auto_now_add=True)

    verification_code = models.CharField(_("Verification Code"),
                                         max_length=128, blank=False,
                                         null=False)
    @property
    def email(self):
        return self.user.email

class UnsubscribedEmail(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="%(app_label)s_%(class)s",
        null=False, blank=False, on_delete=models.CASCADE
    )
    created_on = models.DateTimeField(auto_now_add=True)
    
    nonce = models.CharField(_("nonce"), max_length=256)
    
    hash = models.CharField(_("hash"), max_length=128)


# TODO What's the point of this model???
class IdentityVerificationSession(models.Model):

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="%(app_label)s_%(class)s",
        null=False, blank=False, on_delete=models.CASCADE
    )

    @property
    def full_name(self):
        return self.user.full_name

    @property
    def video_path(self):
        return self.user.video_path
