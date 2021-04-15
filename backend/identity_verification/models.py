import uuid
from random import randint

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

words = ['hello', 'pass', 'chain', 'bitcoin', 'pai', 'smile', 'goal',
         'family', 'own', 'leave', 'put', 'old', 'while', 'mean',
         'keep', 'student', 'why', 'let', 'great', 'same', 'big',
         'group', 'begin', 'seem', 'country', 'help', 'talk', 'where',
         'turn', 'problem', 'point', 'believe', 'hold', 'today', 'bring',
         'happen', 'next', 'without', 'before', 'large', 'million',
         'must', 'home', 'under', 'water', 'room', 'write', 'mother',
         'area', 'national', 'money', ]


def get_randomized_words(count=5):
    r_words = []
    for _ in range(count):
        r_i = randint(0, len(words) - 1)
        r_word = words[r_i]
        r_words.append(r_word)
    return r_words


class StatusChoices(models.TextChoices):
    ACCEPTED = _("Accepted"), "ACCEPTED"
    ACCEPTED_INACTIVE = _('Accepted & Inactive'), "ACCEPTED_INACTIVE"
    PENDING = _("Pending"), "PENDING"
    REJECTED = _("Rejected"), "REJECTED"
    INCOMPLETE = _("Incomplete"), "INCOMPLETE"
    CANCELLED = _("Cancelled"), "CANCELLED"


class GovIdVerificationSession(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="user",
        null=False, blank=False, on_delete=models.CASCADE
    )

    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="reviewer",
        null=True, blank=True, on_delete=models.CASCADE
    )

    full_name = models.CharField(_('full name'), max_length=256, blank=True, null=True)


    status = models.CharField(_("status"), max_length=32,
                              default=StatusChoices.INCOMPLETE,
                              choices=StatusChoices.choices)

    verification_words = models.CharField(_("verification words"),
                                          max_length=256,
                                          default=get_randomized_words)

    created_on = models.DateTimeField(auto_now_add=True)
    reviewed_on = models.DateTimeField(blank=True, null=True)
    verified_on = models.DateTimeField(blank=True, null=True)

    rejection_reason = models.CharField(_("rejection reason"),
                                        max_length=256)

    ip_address = models.CharField(_("ip address"), max_length=64,
                                  blank=False, null=False)

    video_content_type = models.CharField(_("video content type"),
                                          max_length=64)

    video = models.FileField(_("User's video verification"),
                             blank=True, null=True)

    verification_request = models.UUIDField(default=uuid.uuid4,
                                            editable=False,
                                            primary_key=True)

