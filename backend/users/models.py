# Stdlib
import uuid

# Core Django
from django.db import models
from django.contrib.auth.models import (
        PermissionsMixin, 
        UnicodeUsernameValidator, 
        BaseUserManager,
)
from django.contrib.auth.base_user import AbstractBaseUser
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.core.mail import send_mail

from api.models import PhoneVerificationSession, EmailVerificationSession

class PaipassUserManager(BaseUserManager):
    
    use_in_migrations = True
    def _create_user(self, email, password,**extra_fields):
        if not email:
            raise ValueError("The given email must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)
    
    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if extra_fields.get("is_staff") is not True:
           raise ValueError(
               "Superuser must have is_staff=True."
           )
        if extra_fields.get("is_superuser") is not True:
            raise ValueError(
               "Superuser must have is_superuser=True."
           )
        return self._create_user(email, password, **extra_fields)


class PaipassUser(AbstractBaseUser, PermissionsMixin):
    username = None
    email = models.EmailField(_('email address'), unique=True)
    full_name = models.CharField(_('full name'), max_length=256, blank=False)

    preferred_name = models.CharField(_('preferred name'), max_length=256, blank=True)
    PREMIUM_LEVEL_CHOICES = (("premium", _("Premium")),
                             ("free", _("Free")),)
    # default=False means the default value of premium_level is False
    premium_level = models.CharField(_('premium level'), max_length=64,
                                     default=PREMIUM_LEVEL_CHOICES[1][0],
                                     choices=PREMIUM_LEVEL_CHOICES)

    USER_VERIF_LEVEL_CHOICES = (("VERIFIED", _("Verified")),
                                       ("UNVERIFIED",_("UNVERIFIED")))
    UNVERIFIED = USER_VERIF_LEVEL_CHOICES[1][0]
    user_verification_level = models.CharField(_("User verification level"),
                                               max_length=64,
                                               default=UNVERIFIED,
                                               choices=USER_VERIF_LEVEL_CHOICES)

    has_verified_email = models.BooleanField(_('email is verified'), default=False)
    email_verification_request = models.ForeignKey(EmailVerificationSession,
                                                   null=True,
                                                   on_delete=models.CASCADE)
    # why 31: https://stackoverflow.com/questions/723587
    phone_number = models.CharField(_('phone number'), max_length=31, blank=True)
    has_verified_phone = models.BooleanField(_('email is verified'), default=False)
    phone_verification_request = models.ForeignKey(PhoneVerificationSession,
                                                   null=True,
                                                   on_delete=models.CASCADE)


    has_verified_gov_id = models.BooleanField(default=False)

    '''
    An arbitrary unique piece of information for pdp2 and discourse sso.
    
    Specifically, a unique piece of information is needed to distinguish between
    two given torrents of user profile information. That is, since a user profile
    might or might not consist of things like an email address, phone number, etc.
    there is not necessarily anything that can distinguish one user's corresponding
    torrent from another user's corresponding torrent. One way to distinguish this
    might be to send the primary key corresponding to the user but something felt 
    very wrong about this; I think I recall this is a security issue in Oauth
    whereby user ids are given to third parties.
    
    Anyways, this should not be used for anything but in the inclusion into a torrent
    corresponding to the user's profile information. 
    '''
    arbitrary_id = models.UUIDField(primary_key=False,
                                    default=uuid.uuid4,
                                    editable=False,
                                    unique=True)

    #username_validator = UnicodeUsernameValidator()

    # Allow for a blank value to have a completely unverified user; this
    # could allow for the service to become more widely used.
    is_staff = models.BooleanField(
        _('staff status'),
        default=False,
        help_text=_('Designates whether the user can log into this admin site.'),
    )
    is_active = models.BooleanField(
        _('active'),
        default=True,
        help_text=_(
            'Designates whether this user should be treated as active. '
            'Unselect this instead of deleting accounts.'
        ),
    )
    date_joined = models.DateTimeField(_('date joined'), default=timezone.now)

    objects = PaipassUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')

    def clean(self):
        super().clean()
        self.email = self.__class__.objects.normalize_email(self.email)

    def email_user(self, subject, message, from_email=None, **kwargs):
        """Send an email to this user."""
        send_mail(subject, message, from_email, [self.email], **kwargs)

    def __str__(self):
        return self.email
